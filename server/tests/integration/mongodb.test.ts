import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer, type AddressInfo } from 'node:net'
import { once } from 'node:events'
import { parseEnv } from '../../src/config/env.js'
import { authConfig, sessionToken } from '../support/auth.js'

let mongod: ChildProcess
let directory: string
let uri: string
let db: typeof import('../../src/config/database.js')
let Product: ReturnType<
  typeof import('../../src/models/product.js').getProductModel
>
let products: import('../../src/services/products.js').ProductsService

before(
  async () => {
    assert.ok(
      process.env.MONGODB_TEST_BINARY,
      'Set MONGODB_TEST_BINARY to a local mongod executable; no external database is used'
    )
    directory = await mkdtemp(join(tmpdir(), 'volt-mongodb-test-'))
    const reservation = createServer().listen(0, '127.0.0.1')
    await once(reservation, 'listening')
    const port = (reservation.address() as AddressInfo).port
    await new Promise<void>(resolve => reservation.close(() => resolve()))
    uri = `mongodb://127.0.0.1:${port}/volt_stage2_test`
    mongod = spawn(
      process.env.MONGODB_TEST_BINARY,
      [
        '--dbpath',
        directory,
        '--port',
        String(port),
        '--bind_ip',
        '127.0.0.1',
        '--setParameter',
        'enableTestCommands=1',
      ],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }
    )
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Local mongod startup timed out')),
        30000
      )
      const finish = (error?: Error) => {
        clearTimeout(timer)
        error ? reject(error) : resolve()
      }
      mongod.once('error', finish)
      mongod.once('exit', code =>
        finish(new Error(`Local mongod exited: ${code}`))
      )
      mongod.stdout!.on('data', chunk => {
        if (String(chunk).includes('Waiting for connections')) finish()
      })
    })
    db = await import('../../src/config/database.js')
    await Promise.all([db.connectDatabase(uri), db.connectDatabase(uri)])
    Product = (await import('../../src/models/product.js')).getProductModel(
      db.database
    )
    products = (
      await import('../../src/services/mongodb-products.js')
    ).createMongoProductsService()
  },
  { timeout: 40000 }
)

after(async () => {
  if (db) await db.disconnectDatabase()
  if (mongod && mongod.exitCode === null && mongod.signalCode === null) {
    const exited = once(mongod, 'exit')
    mongod.kill()
    await exited
  }
  if (directory) await rm(directory, { recursive: true, force: true })
})

const image = (suffix: string) => ({
  publicId: `test/${suffix}`,
  assetId: suffix,
  secureUrl: `https://res.cloudinary.com/test/${suffix}.png`,
  width: 20,
  height: 30,
  format: 'png',
  bytes: 100,
  checksum: 'a'.repeat(64),
})

test('real MongoDB preserves DTO, gallery and storefront order, hidden detail and unique string IDs', async () => {
  assert.deepEqual(await products.list(), [])
  await Product.create([
    {
      _id: 'recLater',
      name: 'Same',
      price: 1.25,
      catalogOrder: 1,
      images: [image('two'), image('one')],
      source: 'airtable',
      sourceHash: 'hash',
      importedAt: new Date(),
    },
    { _id: ' phone / one ', name: '', price: 0, catalogOrder: 0 },
    { _id: 'hidden', name: 'Hidden', price: 99, catalogOrder: null },
  ])
  const list = await products.list()
  assert.deepEqual(list, [
    {
      id: ' phone / one ',
      name: '',
      price: 0,
      description: '',
      category: '',
      images: [],
      image: '',
    },
    {
      id: 'recLater',
      name: 'Same',
      price: 1.25,
      description: '',
      category: '',
      images: [
        'https://res.cloudinary.com/test/two.png',
        'https://res.cloudinary.com/test/one.png',
      ],
      image: 'https://res.cloudinary.com/test/two.png',
    },
  ])
  assert.equal((await products.get('hidden')).price, 99)
  assert.deepEqual(await products.get(' phone / one '), list[0])
  await assert.rejects(Product.create({ _id: 'hidden', name: '', price: 0 }), {
    code: 11000,
  })
  await assert.rejects(products.get('unknown'), { status: 404 })
  for (const id of ['', ' ', 'x'.repeat(201)])
    await assert.rejects(products.get(id), { status: 400 })
})

test('HTTP uses MongoDB without a source switch; catalog and errors preserve contracts', async () => {
  const { startServer } = await import('../../src/index.js')
  const running = await startServer({
    ...parseEnv({ MONGODB_URI: uri }),
    PORT: 0,
  })
  const url = `http://127.0.0.1:${(running.server.address() as AddressInfo).port}`
  try {
    const list = await fetch(url + '/api/products')
    assert.match(list.headers.get('cache-control')!, /no-store/)
    assert.equal(((await list.json()) as unknown[]).length, 2)
    const catalog = await fetch(url + '/api/products/catalog?price=0')
    const body = (await catalog.json()) as {
      total: number
      min_price: number
      max_price: number
    }
    assert.equal(body.total, 1)
    assert.equal(body.min_price, 0)
    assert.equal(body.max_price, 1.25)
    assert.equal(
      (
        await fetch(
          url + '/api/products/' + encodeURIComponent(' phone / one ')
        )
      ).status,
      200
    )
    assert.equal((await fetch(url + '/api/products/%20')).status, 400)
    assert.equal((await fetch(url + '/api/products/unknown')).status, 404)
    await db.database.db!.admin().command({
      configureFailPoint: 'failCommand',
      mode: { times: 1 },
      data: { failCommands: ['find'], errorCode: 50 },
    })
    const timeout = await fetch(url + '/api/products')
    assert.equal(timeout.status, 504)
    assert.deepEqual(await timeout.json(), {
      error: 'Product service timed out',
    })
    await db.disconnectDatabase()
    const unavailable = await fetch(url + '/api/products')
    assert.equal(unavailable.status, 503)
    assert.deepEqual(await unavailable.json(), {
      error: 'Product service temporarily unavailable',
    })
    assert.equal((await fetch(url + '/api/health')).status, 200)
  } finally {
    await running.close()
  }
  assert.equal(db.database.readyState, 0)
  await db.connectDatabase(uri)
})

test('invalid stored payload returns a safe 502 and aborted calls do not return products', async () => {
  await Product.collection.insertOne({
    _id: 'corrupt',
    name: 'Bad',
    price: -1,
  } as never)
  try {
    await assert.rejects(products.get('corrupt'), { status: 502 })
  } finally {
    await Product.deleteOne({ _id: 'corrupt' })
  }
  const controller = new AbortController()
  controller.abort(new Error('private abort reason'))
  await assert.rejects(
    products.list(controller.signal),
    error => error instanceof Error && !error.message.includes('private')
  )
  await assert.rejects(products.get('hidden', controller.signal))
})

test('an in-flight MongoDB query honors caller cancellation', async () => {
  await db.database.db!.admin().command({
    configureFailPoint: 'failCommand',
    mode: { times: 1 },
    data: {
      failCommands: ['find'],
      blockConnection: true,
      blockTimeMS: 1500,
    },
  })
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new Error('private cancellation')),
    100
  )
  const started = Date.now()
  try {
    await assert.rejects(
      products.list(controller.signal),
      error => error instanceof Error && !error.message.includes('private')
    )
    assert.ok(
      Date.now() - started < 1200,
      'Cancellation must not wait for the blocked database command'
    )
  } finally {
    clearTimeout(timer)
    await db.database
      .db!.admin()
      .command({ configureFailPoint: 'failCommand', mode: 'off' })
  }
})

test('startup failure does not listen and releases the database connection', async () => {
  await db.disconnectDatabase()
  const { startServer } = await import('../../src/index.js')
  await assert.rejects(
    startServer({
      ...parseEnv({
        MONGODB_URI: 'mongodb://127.0.0.1:1/test',
      }),
      PORT: 0,
    }),
    { status: 503 }
  )
  assert.equal(db.database.readyState, 0)
  await db.connectDatabase(uri)
})

test('HTTP listen failure releases MongoDB and successful shutdown closes both', async () => {
  const { startServer } = await import('../../src/index.js')
  const occupied = createServer().listen(0, '127.0.0.1')
  await once(occupied, 'listening')
  try {
    await assert.rejects(
      startServer({
        ...parseEnv({ MONGODB_URI: uri }),
        PORT: (occupied.address() as AddressInfo).port,
      })
    )
    assert.equal(db.database.readyState, 0)
  } finally {
    await new Promise<void>(resolve => occupied.close(() => resolve()))
  }
  const running = await startServer({
    ...parseEnv({ MONGODB_URI: uri }),
    PORT: 0,
  })
  assert.equal(db.database.readyState, 1)
  await Promise.all([running.close(), running.close()])
  assert.equal(running.server.listening, false)
  assert.equal(db.database.readyState, 0)
})

test('Vercel initialization retries a failed MongoDB connection and keeps the pool for later requests', async () => {
  const { createVercelApp } = await import('../../src/vercel.js')
  await db.disconnectDatabase()
  const env = {
    MONGODB_URI: 'mongodb://127.0.0.1:1/unavailable',
    VERCEL_URL: 'store-preview.vercel.app',
  }
  const server = createVercelApp(env).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const url = 'http://127.0.0.1:' + (server.address() as AddressInfo).port
  try {
    const unavailable = await fetch(url + '/api/products')
    assert.equal(unavailable.status, 503)
    assert.ok(!(await unavailable.text()).includes(env.MONGODB_URI))
    env.MONGODB_URI = uri
    const responses = await Promise.all([
      fetch(url + '/api/products/hidden'),
      fetch(url + '/api/products/hidden'),
    ])
    for (const response of responses) {
      assert.equal(response.status, 200)
      assert.match(response.headers.get('cache-control')!, /no-store/)
      const product = (await response.json()) as { id: string; price: number }
      assert.equal(product.id, 'hidden')
      assert.equal(product.price, 99)
    }
    assert.equal(db.database.readyState, 1)
    assert.equal((await fetch(url + '/api/products/unknown')).status, 404)
    const list = await fetch(url + '/api/products')
    assert.equal(list.status, 200)
    assert.ok(Array.isArray(await list.json()))
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
  assert.equal(db.database.readyState, 1)
})

const environment = {
  VERCEL_URL: 'store-preview.vercel.app',
  VERCEL_PROJECT_PRODUCTION_URL: 'store.vercel.app',
  VERCEL_BRANCH_URL: 'store-git-main.vercel.app',
  CORS_ORIGINS: 'https://shop.example.com',
}

async function withApi(
  env: NodeJS.ProcessEnv,
  run: (url: string) => Promise<void>
) {
  env.MONGODB_URI ??= uri
  const server = (await import('../../src/vercel.js'))
    .createVercelApp(env)
    .listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address() as import('node:net').AddressInfo
  try {
    await run('http://127.0.0.1:' + address.port)
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
}

test('Vercel API allows its deployment aliases and explicit custom origin only', async () => {
  await withApi(environment, async url => {
    for (const origin of [
      'https://store-preview.vercel.app',
      'https://store.vercel.app',
      'https://store-git-main.vercel.app',
      'https://shop.example.com',
    ]) {
      const response = await fetch(url + '/api/chat', {
        method: 'OPTIONS',
        headers: { Origin: origin, 'Access-Control-Request-Method': 'POST' },
      })
      assert.equal(response.status, 204)
      assert.equal(response.headers.get('access-control-allow-origin'), origin)
    }
    const denied = await fetch(url + '/api/health', {
      headers: {
        Origin: 'https://attacker.vercel.app',
        'X-Forwarded-Host': 'attacker.vercel.app',
      },
    })
    assert.equal(denied.status, 403)
    assert.equal(denied.headers.get('access-control-allow-origin'), null)
  })
})

test('failed initialization is safe, is not cached forever, and never serves client files', async () => {
  const env: NodeJS.ProcessEnv = {
    MONGODB_URI: 'secret-invalid-uri',
  }
  await withApi(env, async url => {
    const failed = await fetch(url + '/api/products')
    assert.equal(failed.status, 503)
    assert.match(failed.headers.get('cache-control')!, /no-store/)
    assert.ok(!(await failed.text()).includes('secret-invalid-uri'))
    Object.assign(env, environment, { MONGODB_URI: uri })
    const responses = await Promise.all([
      fetch(url + '/api/health'),
      fetch(url + '/api/health'),
    ])
    for (const response of responses) {
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), { status: 'ok' })
    }
    for (const path of ['/api/unknown', '/products/rec1']) {
      const response = await fetch(url + path)
      assert.equal(response.status, 404)
      assert.match(response.headers.get('content-type')!, /application\/json/)
    }
    const invalid = await fetch(url + '/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://store.vercel.app',
      },
      body: '{',
    })
    assert.equal(invalid.status, 400)
  })
})

test('favorites isolate accounts, merge once, preserve concurrent writes and reject stale ordering', async () => {
  const { createMongoFavoritesService } =
    await import('../../src/services/mongodb-favorites.js')
  const { getFavoritesModel } = await import('../../src/models/favorites.js')
  const favorites = createMongoFavoritesService(db.database)
  const Favorite = getFavoritesModel(db.database)
  await Favorite.createCollection()
  await Product.create([
    { _id: 'fav-one', name: 'One', price: 1, catalogOrder: 0 },
    { _id: 'fav-hidden', name: 'Hidden', price: 2 },
    { _id: 'fav-three', name: 'Three', price: 3, catalogOrder: 1 },
  ])
  assert.deepEqual(await favorites.get('user_fav_a'), { ids: [], revision: 0 })
  const merged = await favorites.merge('user_fav_a', {
    ids: ['fav-one', 'fav-one', 'fav-hidden', 'missing'],
    batchId: 'import-one',
  })
  assert.deepEqual(merged.ids, ['fav-one', 'fav-hidden'])
  assert.deepEqual((await favorites.get('user_fav_b')).ids, [])
  await favorites.remove('user_fav_a', 'fav-one')
  const retried = await favorites.merge('user_fav_a', {
    ids: ['fav-one', 'fav-hidden'],
    batchId: 'import-one',
  })
  assert.deepEqual(
    retried.ids,
    ['fav-hidden'],
    'lost-ack retry must not resurrect a removed product'
  )
  await Promise.all([
    favorites.add('user_fav_a', 'fav-one'),
    favorites.add('user_fav_a', 'fav-three'),
    favorites.add('user_fav_a', 'fav-one'),
  ])
  const all = await favorites.get('user_fav_a')
  assert.deepEqual([...all.ids].sort(), ['fav-hidden', 'fav-one', 'fav-three'])
  await assert.rejects(
    favorites.reorder('user_fav_a', {
      ids: all.ids,
      revision: merged.revision,
    }),
    { status: 409 }
  )
  await assert.rejects(
    favorites.reorder('user_fav_a', {
      ids: ['fav-hidden'],
      revision: all.revision,
    }),
    { status: 409 }
  )
  const reordered = await favorites.reorder('user_fav_a', {
    ids: ['fav-three', 'fav-one', 'fav-hidden'],
    revision: all.revision,
  })
  assert.deepEqual(reordered.ids, ['fav-three', 'fav-one', 'fav-hidden'])
  await Product.deleteOne({ _id: 'fav-one' })
  const pruned = await favorites.get('user_fav_a')
  assert.deepEqual(pruned.ids, ['fav-three', 'fav-hidden'])
  assert.ok(pruned.revision > reordered.revision)
  await favorites.reorder('user_fav_a', {
    ids: ['fav-hidden', 'fav-three'],
    revision: pruned.revision,
  })
  await assert.rejects(favorites.add('user_fav_a', 'missing'), { status: 404 })
  await assert.rejects(favorites.add('user_fav_a', 'demo_one'), { status: 400 })
  await assert.rejects(
    new Favorite({
      _id: 'invalid',
      productIds: ['duplicate', 'duplicate'],
    }).validate()
  )
  assert.equal(await Favorite.countDocuments({ _id: 'user_fav_a' }), 1)
})

test('simultaneous first imports commit their receipt and union in the same document', async () => {
  const { createMongoFavoritesService } =
    await import('../../src/services/mongodb-favorites.js')
  const favorites = createMongoFavoritesService(db.database)
  await Promise.all([
    favorites.merge('user_race', { ids: ['fav-hidden'], batchId: 'race-a' }),
    favorites.merge('user_race', { ids: ['fav-three'], batchId: 'race-b' }),
    favorites.merge('user_race', { ids: ['fav-hidden'], batchId: 'race-a' }),
  ])
  assert.deepEqual((await favorites.get('user_race')).ids.sort(), [
    'fav-hidden',
    'fav-three',
  ])
  await favorites.remove('user_race', 'fav-hidden')
  await favorites.merge('user_race', { ids: ['fav-hidden'], batchId: 'race-a' })
  assert.deepEqual((await favorites.get('user_race')).ids, ['fav-three'])
})

test('runtime favorites flow verifies Clerk tokens and persists only the authenticated account', async () => {
  const { createRuntimeApp } = await import('../../src/runtime.js')
  const app = await createRuntimeApp(
    { ...authConfig, MONGODB_URI: uri },
    { serveClient: false }
  )
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const url =
    'http://127.0.0.1:' +
    (server.address() as import('node:net').AddressInfo).port +
    '/api/me/favorites'
  const headers = {
    Authorization: 'Bearer ' + sessionToken('user_http'),
    'Content-Type': 'application/json',
  }
  try {
    const added = await fetch(url + '/items/fav-hidden', {
      method: 'PUT',
      headers,
    })
    assert.equal(added.status, 200)
    assert.deepEqual(((await added.json()) as { ids: string[] }).ids, [
      'fav-hidden',
    ])
    const read = await fetch(url + '?userId=user_other', { headers })
    assert.match(read.headers.get('cache-control')!, /private.*no-store/)
    assert.deepEqual(((await read.json()) as { ids: string[] }).ids, [
      'fav-hidden',
    ])
    const other = await fetch(url, {
      headers: { Authorization: 'Bearer ' + sessionToken('user_other') },
    })
    assert.deepEqual(((await other.json()) as { ids: string[] }).ids, [])
    const invalid = await fetch(url + '/items/fav-hidden', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer invalid' },
    })
    assert.equal(invalid.status, 401)
    const removed = await fetch(url + '/items/fav-hidden', {
      method: 'DELETE',
      headers,
    })
    assert.deepEqual(((await removed.json()) as { ids: string[] }).ids, [])
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

test('admin HTTP CRUD persists to MongoDB, updates catalog filters and prunes deleted favorites', async () => {
  const { createRuntimeApp } = await import('../../src/runtime.js')
  const { createMongoFavoritesService } =
    await import('../../src/services/mongodb-favorites.js')
  const app = await createRuntimeApp(
    { ...authConfig, MONGODB_URI: uri },
    { serveClient: false }
  )
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base =
    'http://127.0.0.1:' +
    (server.address() as import('node:net').AddressInfo).port +
    '/api/products'
  const request = (
    path: string,
    method = 'GET',
    body?: unknown,
    authenticated = true
  ) =>
    fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization:
          'Bearer ' +
          (authenticated ? sessionToken('crud_admin', { role: 'admin' }) : ''),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  try {
    const count = await Product.countDocuments()
    assert.equal(
      (await request('', 'POST', { name: 'Forbidden', price: 1 }, false))
        .status,
      401
    )
    assert.equal(await Product.countDocuments(), count)
    const created = await request('', 'POST', {
      name: ' New stage4 phone ',
      price: 25,
      category: ' stage4 ',
      images: ['https://example.com/one.png', 'https://example.com/two.png'],
    })
    assert.equal(created.status, 201)
    const product =
      (await created.json()) as import('../../src/services/products.js').Product
    assert.match(product.id, /^prod_[0-9a-f-]{36}$/)
    assert.deepEqual(product, {
      id: product.id,
      name: 'New stage4 phone',
      price: 25,
      category: 'stage4',
      description: '',
      images: ['https://example.com/one.png', 'https://example.com/two.png'],
      image: 'https://example.com/one.png',
    })
    const stored = await Product.findById(product.id).lean().exec()
    assert.ok(stored)
    assert.ok(
      typeof stored.catalogOrder === 'number' && stored.catalogOrder >= 0
    )
    assert.ok((await products.list()).some(item => item.id === product.id))
    assert.deepEqual(await (await request('/' + product.id)).json(), product)
    const favorites = createMongoFavoritesService()
    await favorites.add('crud_favorites', product.id)
    const updated = await request('/' + product.id, 'PATCH', {
      price: 0,
      name: 'Updated stage4 phone',
      description: 'Edited',
    })
    assert.equal(updated.status, 200)
    assert.deepEqual(await updated.json(), {
      ...product,
      price: 0,
      name: 'Updated stage4 phone',
      description: 'Edited',
    })
    const catalog = (await (
      await request('/catalog?category=stage4&text=Updated&price=0')
    ).json()) as { items: unknown[]; total: number }
    assert.equal(catalog.total, 1)
    assert.deepEqual(catalog.items, [
      {
        ...product,
        price: 0,
        name: 'Updated stage4 phone',
        description: 'Edited',
      },
    ])
    assert.equal(
      (await request('/' + product.id, 'PATCH', { images: [] })).status,
      200
    )
    assert.deepEqual((await products.get(product.id)).images, [])
    assert.equal((await products.get(product.id)).image, '')
    const deleted = await request('/' + product.id, 'DELETE')
    assert.equal(deleted.status, 204)
    assert.equal(await deleted.text(), '')
    assert.equal(await Product.findById(product.id).lean().exec(), null)
    assert.equal((await request('/' + product.id)).status, 404)
    assert.equal((await request('/' + product.id, 'DELETE')).status, 404)
    assert.equal(
      (await request('/' + product.id, 'PATCH', { price: 1 })).status,
      404
    )
    assert.ok(!(await products.list()).some(item => item.id === product.id))
    assert.deepEqual((await favorites.get('crud_favorites')).ids, [])
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

test('admin edits preserve imported image metadata and hidden status; concurrent patches keep independent fields', async () => {
  const { createRuntimeApp } = await import('../../src/runtime.js')
  const original = {
    _id: ' legacy / stage4 ',
    name: 'Legacy',
    price: 10,
    catalogOrder: null,
    images: [image('legacy-stage4')],
    source: 'airtable' as const,
    sourceHash: 'original-hash',
    sourceNamespace: 'a'.repeat(64),
    importHash: 'b'.repeat(64),
    importedAt: new Date('2025-01-01'),
  }
  await Product.create(original)
  const app = await createRuntimeApp(
    { ...authConfig, MONGODB_URI: uri },
    { serveClient: false }
  )
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base =
    'http://127.0.0.1:' +
    (server.address() as import('node:net').AddressInfo).port +
    '/api/products'
  const request = (path: string, method: string, body: unknown) =>
    fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + sessionToken('admin', { role: 'admin' }),
      },
      body: JSON.stringify(body),
    })
  const path = '/' + encodeURIComponent(original._id)
  try {
    assert.equal(
      (await request(path, 'PATCH', { description: 'Updated' })).status,
      200
    )
    assert.deepEqual((await products.get(original._id)).images, [
      'https://res.cloudinary.com/test/legacy-stage4.png',
    ])
    assert.equal(
      (
        await request(path, 'PATCH', {
          images: ['https://example.com/new.png'],
        })
      ).status,
      200
    )
    assert.deepEqual((await products.get(original._id)).images, [
      'https://example.com/new.png',
    ])
    const after = await Product.findById(original._id).lean().exec()
    assert.ok(after)
    for (const key of [
      'catalogOrder',
      'source',
      'sourceHash',
      'sourceNamespace',
      'importHash',
      'importedAt',
      'images',
    ] as const)
      assert.deepEqual(after[key], original[key])
    assert.ok(!(await products.list()).some(item => item.id === original._id))
    const patches = await Promise.all([
      request(path, 'PATCH', { price: 123 }),
      request(path, 'PATCH', { description: 'Concurrent description' }),
    ])
    assert.deepEqual(
      patches.map(response => response.status),
      [200, 200]
    )
    assert.equal((await products.get(original._id)).price, 123)
    assert.equal(
      (await products.get(original._id)).description,
      'Concurrent description'
    )
    const creations = await Promise.all([
      request('', 'POST', { name: 'First concurrent', price: 1 }),
      request('', 'POST', { name: 'Second concurrent', price: 2 }),
    ])
    assert.deepEqual(
      creations.map(response => response.status),
      [201, 201]
    )
    const ids = await Promise.all(
      creations.map(
        async response => ((await response.json()) as { id: string }).id
      )
    )
    assert.equal(new Set(ids).size, 2)
    const visible = (await products.list()).map(item => item.id)
    assert.ok(ids.every(id => visible.includes(id)))
    assert.equal(
      (await request('/does-not-exist', 'PATCH', { name: 'Never upsert' }))
        .status,
      404
    )
    assert.equal(await Product.findById('does-not-exist').lean().exec(), null)
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

test('user ownership is persisted and enforced by real MongoDB writes and personal HTTP lists', async () => {
  const records =
    db.database.collection<import('../../src/models/product.js').StoredProduct>(
      'products'
    )
  const { createRuntimeApp } = await import('../../src/runtime.js')
  const app = await createRuntimeApp(
    { ...authConfig, MONGODB_URI: uri },
    { serveClient: false }
  )
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base =
    'http://127.0.0.1:' + (server.address() as AddressInfo).port + '/api'
  const request = (
    path: string,
    userId = '',
    method = 'GET',
    body?: unknown,
    role = 'user'
  ) =>
    fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: userId ? 'Bearer ' + sessionToken(userId, { role }) : '',
        'X-Role': 'admin',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  try {
    await Product.create({
      _id: 'ownership-legacy',
      name: 'Original',
      price: 19,
      catalogOrder: 500,
      images: [image('ownership')],
    })
    const legacyBefore = await records.findOne({
      _id: 'ownership-legacy',
    })
    const created = await request('/products', 'owner_a', 'POST', {
      name: 'A phone',
      price: 11,
    })
    assert.equal(created.status, 201)
    const a =
      (await created.json()) as import('../../src/services/products.js').Product
    const second = await request('/products', 'owner_a', 'POST', {
      name: 'A second',
      price: 12,
    })
    assert.equal(second.status, 201)
    const a2 = (await second.json()) as { id: string }
    const other = await request('/products', 'owner_b', 'POST', {
      name: 'B phone',
      price: 22,
    })
    assert.equal(other.status, 201)
    const b = (await other.json()) as { id: string }
    const stored = await records.findOne({ _id: a.id })
    assert.equal(stored?.ownerId, 'owner_a')
    await records.updateOne(
      { _id: a2.id },
      { $set: { catalogOrder: stored!.catalogOrder } }
    )
    assert.equal('ownerId' in a, false)
    assert.deepEqual(await (await request('/products/' + a.id)).json(), a)
    assert.deepEqual(
      await (await request('/products/' + a.id, 'owner_b')).json(),
      a
    )
    assert.ok((await products.list()).some(p => p.id === a.id))
    const personal = await request(
      '/me/products?userId=owner_b&ownerId=owner_b',
      'owner_a'
    )
    assert.equal(personal.status, 200)
    assert.match(personal.headers.get('cache-control')!, /private.*no-store/)
    const own = (await personal.json()) as { id: string; ownerId?: string }[]
    assert.deepEqual(
      own.map(p => p.id),
      [a.id, a2.id].sort()
    )
    assert.ok(own.every(p => !('ownerId' in p)))
    assert.deepEqual(
      (
        (await (await request('/me/products', 'owner_b')).json()) as {
          id: string
        }[]
      ).map(p => p.id),
      [b.id]
    )
    assert.deepEqual(
      await (await request('/me/products', 'empty_owner')).json(),
      []
    )
    assert.equal((await request('/me/products')).status, 401)

    for (const id of [a.id, 'ownership-legacy']) {
      const before = await records.findOne({ _id: id })
      const attempts = await Promise.all([
        request('/products/' + id, 'owner_b', 'PATCH', { price: 999 }),
        request('/products/' + id, 'owner_b', 'DELETE'),
        request('/products/' + id, 'owner_b', 'PATCH', { price: 999 }, 'Admin'),
      ])
      assert.deepEqual(
        attempts.map(r => r.status),
        [403, 403, 403]
      )
      assert.deepEqual(await records.findOne({ _id: id }), before)
    }
    for (const body of [
      { ownerId: 'owner_b' },
      { role: 'admin' },
      { $set: { ownerId: 'owner_b' } },
    ]) {
      assert.equal(
        (await request('/products/' + a.id, 'owner_a', 'PATCH', body)).status,
        400
      )
    }
    const patches = await Promise.all([
      request('/products/' + a.id, 'owner_a', 'PATCH', { price: 33 }),
      request('/products/' + a.id, 'owner_a', 'PATCH', {
        description: 'Own edit',
      }),
      request('/products/' + a.id, 'owner_b', 'DELETE'),
    ])
    assert.deepEqual(
      patches.map(r => r.status),
      [200, 200, 403]
    )
    assert.equal((await products.get(a.id)).price, 33)
    assert.equal((await products.get(a.id)).description, 'Own edit')
    assert.equal((await records.findOne({ _id: a.id }))?.ownerId, 'owner_a')
    assert.deepEqual(
      await records.findOne({ _id: 'ownership-legacy' }),
      legacyBefore
    )

    assert.equal(
      (
        await request(
          '/products/' + b.id,
          'moderator',
          'PATCH',
          { name: 'Moderated' },
          'admin'
        )
      ).status,
      200
    )
    assert.equal((await records.findOne({ _id: b.id }))?.ownerId, 'owner_b')
    assert.equal(
      (
        await request(
          '/products/' + b.id,
          'moderator',
          'DELETE',
          undefined,
          'admin'
        )
      ).status,
      204
    )
    assert.equal(
      (
        await request(
          '/products/ownership-legacy',
          'moderator',
          'PATCH',
          { price: 20 },
          'admin'
        )
      ).status,
      200
    )
    assert.equal(
      (
        await request(
          '/products/ownership-legacy',
          'moderator',
          'DELETE',
          undefined,
          'admin'
        )
      ).status,
      204
    )
    for (const userId of ['owner_a', 'owner_b']) {
      assert.equal(
        (await request('/me/favorites/items/' + a.id, userId, 'PUT')).status,
        200
      )
    }
    assert.equal(
      (
        await request(
          '/products/' + a.id,
          'moderator',
          'DELETE',
          undefined,
          'admin'
        )
      ).status,
      204
    )
    assert.equal((await request('/products/' + a.id)).status, 404)
    for (const userId of ['owner_a', 'owner_b']) {
      const after = (await (await request('/me/favorites', userId)).json()) as {
        ids: string[]
      }
      assert.equal(after.ids.includes(a.id), false)
    }
    assert.equal(
      (await request('/products/' + a.id, 'owner_a', 'DELETE')).status,
      404
    )
    assert.equal(
      (
        await request('/products/no-such-owned', 'owner_b', 'PATCH', {
          price: 1,
        })
      ).status,
      404
    )
    assert.deepEqual(
      (
        (await (await request('/me/products', 'owner_a')).json()) as {
          id: string
        }[]
      ).map(p => p.id),
      [a2.id]
    )
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

test('ownership index preparation is idempotent and changes no product documents', async () => {
  const { prepareProductIndexes } = await import('../../src/models/product.js')
  const before = await Product.collection.find({}).sort({ _id: 1 }).toArray()
  const originalIndexes = await Product.collection.listIndexes().toArray()
  assert.equal(
    originalIndexes.some(index => index.name === 'product_owner_catalog_order'),
    false
  )
  await prepareProductIndexes(db.database)
  await prepareProductIndexes(db.database)
  const indexes = await Product.collection.listIndexes().toArray()
  assert.deepEqual(
    indexes.find(index => index.name === 'product_owner_catalog_order')?.key,
    { ownerId: 1, catalogOrder: 1, _id: 1 }
  )
  assert.ok(
    originalIndexes.every(index =>
      indexes.some(current => current.name === index.name)
    )
  )
  assert.deepEqual(
    await Product.collection.find({}).sort({ _id: 1 }).toArray(),
    before
  )
})

test('administrative MongoDB list sorts dates and legacy deterministically, preserves documents and supports moderation', async () => {
  const { createRuntimeApp } = await import('../../src/runtime.js')
  const app = await createRuntimeApp(
    { ...authConfig, MONGODB_URI: uri },
    { serveClient: false }
  )
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base =
    'http://127.0.0.1:' + (server.address() as AddressInfo).port + '/api'
  const request = (
    path: string,
    role = 'admin',
    method = 'GET',
    body?: unknown
  ) =>
    fetch(base + path, {
      method,
      headers: {
        Authorization: 'Bearer ' + sessionToken('moderator', { role }),
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  const records =
    db.database.collection<import('../../src/models/product.js').StoredProduct>(
      'products'
    )
  try {
    await Product.create([
      {
        _id: 'admin-z',
        name: 'Recent',
        price: 1,
        ownerId: 'author',
        catalogOrder: 900,
      },
      {
        _id: 'admin-a',
        name: 'Tied',
        price: 2,
        ownerId: 'author',
        catalogOrder: 901,
      },
      {
        _id: 'admin-old',
        name: 'Older',
        price: 3,
        ownerId: 'author',
        catalogOrder: 902,
      },
      { _id: 'admin-legacy', name: 'Legacy', price: 4, catalogOrder: 903 },
    ])
    await records.updateMany(
      { _id: { $in: ['admin-z', 'admin-a'] } },
      { $set: { createdAt: new Date('2026-10-31T10:00:00Z') } }
    )
    await records.updateOne(
      { _id: 'admin-old' },
      { $set: { createdAt: new Date('2026-10-30T10:00:00Z') } }
    )
    await records.updateOne(
      { _id: 'admin-legacy' },
      { $unset: { createdAt: '' } }
    )
    const before = await records
      .find({ _id: /^admin-/ })
      .sort({ _id: 1 })
      .toArray()
    const response = await request('/admin/products')
    assert.equal(response.status, 200)
    const rows =
      (await response.json()) as import('../../src/services/products.js').AdminProduct[]
    const selected = rows.filter(row => row.product.id.startsWith('admin-'))
    assert.deepEqual(
      selected.map(row => row.product.id),
      ['admin-a', 'admin-z', 'admin-old', 'admin-legacy']
    )
    assert.equal(selected[0].ownerId, 'author')
    assert.equal(selected[0].createdAt, '2026-10-31T10:00:00.000Z')
    assert.equal(selected[3].ownerId, null)
    assert.equal(selected[3].createdAt, null)
    assert.deepEqual(Object.keys(selected[0]).sort(), [
      'createdAt',
      'notification',
      'ownerId',
      'product',
    ])
    assert.deepEqual(
      await records
        .find({ _id: /^admin-/ })
        .sort({ _id: 1 })
        .toArray(),
      before
    )
    const publicProduct = (await (
      await request('/products/admin-a', 'user')
    ).json()) as Record<string, unknown>
    assert.equal('ownerId' in publicProduct, false)
    assert.equal('createdAt' in publicProduct, false)
    assert.equal(
      (await request('/products/admin-a', 'user', 'DELETE')).status,
      403
    )
    assert.equal(
      (await request('/products/admin-a', 'admin', 'PATCH', { price: 9 }))
        .status,
      200
    )
    assert.equal(
      (await request('/products/admin-a', 'admin', 'DELETE')).status,
      204
    )
    assert.equal(
      (await request('/products/admin-a', 'user', 'PATCH', { price: 7 }))
        .status,
      404
    )
    assert.equal((await request('/products/admin-a', 'user')).status, 404)
    const after = (await (
      await request('/admin/products')
    ).json()) as import('../../src/services/products.js').AdminProduct[]
    assert.equal(
      after.some(row => row.product.id === 'admin-a'),
      false
    )
    assert.equal((await request('/admin/products', 'user')).status, 403)
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

const notificationRecords = () =>
  db.database.collection<import('../../src/models/product.js').StoredProduct>(
    'products'
  )

test('new publications atomically contain notification state, while legacy/PATCH remain untouched', async () => {
  const { createMongoProductsService } =
    await import('../../src/services/mongodb-products.js')
  const writes = createMongoProductsService({ notificationsConfigured: true })
  const input = {
    name: 'Notification source',
    price: 12,
    description: '',
    category: '',
    images: [],
  }
  const actor = { userId: 'notification-author', role: 'user' as const }
  const created = await writes.create(input, actor)
  const raw = await notificationRecords().findOne({ _id: created.id })
  assert.equal(raw?.notification?.status, 'pending')
  assert.equal(raw?.notification?.channel, 'telegram')
  assert.equal(raw?.notification?.attempts, 0)
  assert.equal(raw?.notification?.snapshot?.name, input.name)
  await writes.update(created.id, { name: 'Changed after creation' }, actor)
  assert.deepEqual(
    (await notificationRecords().findOne({ _id: created.id }))?.notification,
    raw?.notification
  )
  assert.equal('notification' in created, false)
  assert.equal('notification' in (await writes.get(created.id)), false)
  const unconfigured = await createMongoProductsService().create(input, actor)
  const missing = await notificationRecords().findOne({ _id: unconfigured.id })
  assert.equal(missing?.notification?.status, 'failed')
  assert.equal(missing?.notification?.errorCode, 'configuration')
  assert.equal(
    (await notificationRecords().findOne({ _id: 'admin-legacy' }))
      ?.notification,
    undefined
  )
})

test('notification workers claim atomically, freeze payload across edits and fence expired workers', async () => {
  const { createMongoProductNotifications } =
    await import('../../src/services/mongodb-product-notifications.js')
  const { createMongoProductsService } =
    await import('../../src/services/mongodb-products.js')
  const { createTelegramSender } =
    await import('../../src/services/telegram.js')
  const writes = createMongoProductsService({ notificationsConfigured: true })
  const actor = { userId: 'worker-author', role: 'user' as const }
  const input = {
    name: 'Original message name',
    price: 13,
    description: '',
    category: '',
    images: [],
  }
  const product = await writes.create(input, actor)
  let finish!: (value: { messageId: string }) => void
  let started!: () => void
  const start = new Promise<void>(resolve => {
    started = resolve
  })
  const calls: Array<{ message: unknown }> = []
  const base = createTelegramSender({
    TELEGRAM_BOT_TOKEN: '123456:abcdefghijklmnopqrstuvwxyz_123456789',
    TELEGRAM_ADMIN_CHAT_ID: '123456789',
    PUBLIC_SITE_URL: 'https://shop.example.test',
  })!
  const sender = {
    prepare: base.prepare,
    send: async (
      message: import('../../src/services/telegram.js').TelegramMessage
    ) => {
      calls.push({ message })
      started()
      return new Promise<{ messageId: string }>(resolve => {
        finish = resolve
      })
    },
  }
  const worker = createMongoProductNotifications(sender)
  const first = worker.sendProductNotification(product.id)
  await start
  assert.equal(await worker.sendProductNotification(product.id), 'skipped')
  await assert.rejects(worker.retry(product.id), { status: 409 })
  assert.equal(calls.length, 1)
  await writes.update(product.id, { name: 'Edited message name' }, actor)
  await notificationRecords().updateOne(
    { _id: product.id },
    { $set: { 'notification.leaseUntil': new Date(0) } }
  )
  const recovery = createMongoProductNotifications({
    prepare: () => {
      throw new Error('payload must be reused')
    },
    send: async message => {
      assert.deepEqual(message, calls[0].message)
      return { messageId: 'recovered' }
    },
  })
  assert.equal(await recovery.sendProductNotification(product.id), 'sent')
  finish({ messageId: 'stale-worker' })
  assert.equal(await first, 'skipped')
  const saved = await notificationRecords().findOne({ _id: product.id })
  assert.equal(saved?.notification?.providerMessageId, 'recovered')
  assert.equal(saved?.notification?.attempts, 2)
  assert.equal(await worker.sendProductNotification(product.id), 'skipped')
  await assert.rejects(worker.retry(product.id), { status: 409 })
})

test('notification retries honor backoff and Retry-After, exhaust four attempts and recover abandoned last leases', async () => {
  const { createMongoProductNotifications } =
    await import('../../src/services/mongodb-product-notifications.js')
  const { createMongoProductsService } =
    await import('../../src/services/mongodb-products.js')
  const { NotificationError } = await import('../../src/services/telegram.js')
  let now = new Date('2026-11-02T10:00:00Z')
  const writes = createMongoProductsService({ notificationsConfigured: true })
  const product = await writes.create(
    { name: 'Retry', price: 1, description: '', category: '', images: [] },
    { userId: 'retry-author', role: 'user' }
  )
  await notificationRecords().updateOne(
    { _id: product.id },
    { $set: { 'notification.nextAttemptAt': now } }
  )
  const payload = {
    chatId: '123456789',
    productUrl: 'https://shop.example.test/product/one',
    adminUrl: 'https://shop.example.test/admin/products',
    text: 'New',
  }
  const worker = createMongoProductNotifications(
    {
      prepare: () => payload,
      send: async () => {
        throw new NotificationError('rate_limit', true, 120000)
      },
    },
    () => now
  )
  for (const delay of [120000, 300000, 1800000]) {
    assert.equal(await worker.sendProductNotification(product.id), 'deferred')
    const row = await notificationRecords().findOne({ _id: product.id })
    assert.equal(
      row?.notification?.nextAttemptAt?.getTime(),
      now.getTime() + delay
    )
    assert.equal(await worker.sendProductNotification(product.id), 'skipped')
    now = new Date(now.getTime() + delay)
  }
  assert.equal(await worker.sendProductNotification(product.id), 'failed')
  assert.equal(
    (await notificationRecords().findOne({ _id: product.id }))?.notification
      ?.attempts,
    4
  )
  assert.equal(await worker.sendProductNotification(product.id), 'skipped')
  const restored = createMongoProductNotifications(
    {
      prepare: () => payload,
      send: async () => ({ messageId: 'manual-success' }),
    },
    () => now
  )
  assert.equal(await restored.retry(product.id), 'sent')
  assert.equal(
    (await notificationRecords().findOne({ _id: product.id }))?.notification
      ?.attempts,
    1
  )
  await notificationRecords().updateOne(
    { _id: product.id },
    {
      $set: {
        'notification.status': 'pending',
        'notification.attempts': 4,
        'notification.leaseUntil': new Date(0),
      },
    }
  )
  assert.equal(await worker.sendProductNotification(product.id), 'failed')
  assert.equal(
    (await notificationRecords().findOne({ _id: product.id }))?.notification
      ?.status,
    'failed'
  )
})

test('notification batch is bounded, deleted/legacy products are skipped and configuration/permanent failures remain visible', async () => {
  const { createMongoProductNotifications } =
    await import('../../src/services/mongodb-product-notifications.js')
  const { createMongoProductsService } =
    await import('../../src/services/mongodb-products.js')
  const { NotificationError } = await import('../../src/services/telegram.js')
  // Isolate eligible jobs from earlier tests without touching product/legacy records.
  await notificationRecords().updateMany(
    { 'notification.status': 'pending' },
    { $set: { 'notification.nextAttemptAt': new Date('2100-01-01') } }
  )
  const writes = createMongoProductsService({ notificationsConfigured: true })
  const input = {
    name: 'Batch',
    price: 1,
    description: '',
    category: '',
    images: [],
  }
  const actor = { userId: 'batch-author', role: 'user' as const }
  let sends = 0
  const payload = {
    chatId: '123456789',
    productUrl: 'https://shop.example.test/product/one',
    adminUrl: 'https://shop.example.test/admin/products',
    text: 'New',
  }
  const worker = createMongoProductNotifications({
    prepare: () => payload,
    send: async () => {
      sends++
      return { messageId: 'batch-message' }
    },
  })
  for (let i = 0; i < 12; i++) await writes.create(input, actor)
  const removed = await writes.create(input, actor)
  await writes.remove(removed.id, actor)
  assert.equal(await worker.sendProductNotification(removed.id), 'skipped')
  assert.equal(await worker.sendProductNotification('admin-legacy'), 'skipped')
  assert.deepEqual(await worker.processProductNotifications(), {
    processed: 10,
  })
  assert.equal(sends, 10)
  assert.deepEqual(await worker.processProductNotifications(), { processed: 2 })
  const misconfigured = await writes.create(input, actor)
  assert.equal(
    await createMongoProductNotifications().sendProductNotification(
      misconfigured.id
    ),
    'failed'
  )
  assert.equal(
    (await notificationRecords().findOne({ _id: misconfigured.id }))
      ?.notification?.errorCode,
    'configuration'
  )
  const permanent = createMongoProductNotifications({
    prepare: () => payload,
    send: async () => {
      throw new NotificationError('provider_rejected', false)
    },
  })
  assert.equal(await permanent.retry(misconfigured.id), 'failed')
  const row = (await writes.listForAdmin()).find(
    row => row.product.id === misconfigured.id
  )!
  assert.equal(row.notification?.status, 'failed')
  assert.equal(row.notification?.errorCode, 'provider_rejected')
  assert.equal('payload' in row.notification!, false)
  assert.equal('notification' in (await writes.get(misconfigured.id)), false)
})

test('historical jobs are not sent, retried, exhausted or allowed to starve Telegram jobs', async () => {
  const { createMongoProductNotifications } =
    await import('../../src/services/mongodb-product-notifications.js')
  const { createMongoProductsService } =
    await import('../../src/services/mongodb-products.js')
  const writes = createMongoProductsService({ notificationsConfigured: true })
  const input = {
    name: 'Historical',
    price: 1,
    description: '',
    category: '',
    images: [],
  }
  const actor = { userId: 'history-author', role: 'user' as const }
  const history: string[] = []
  for (let i = 0; i < 12; i++) {
    const old = await writes.create(input, actor)
    history.push(old.id)
    await notificationRecords().updateOne(
      { _id: old.id },
      {
        $unset: { 'notification.channel': '' },
        $set: { 'notification.nextAttemptAt': new Date(0) },
      }
    )
  }
  const before = await notificationRecords().findOne({ _id: history[0] })
  let sends = 0
  const worker = createMongoProductNotifications({
    prepare: () => ({
      chatId: '1234',
      text: 'New',
      productUrl: 'https://shop.example.test/product/one',
      adminUrl: 'https://shop.example.test/admin/products',
    }),
    send: async () => {
      sends++
      return { messageId: 'new-message' }
    },
  })
  assert.equal(await worker.sendProductNotification(history[0]), 'skipped')
  await assert.rejects(worker.retry(history[0]), { status: 409 })
  const fresh = await writes.create(input, actor)
  await worker.processProductNotifications()
  assert.equal(
    (await notificationRecords().findOne({ _id: fresh.id }))?.notification
      ?.status,
    'sent'
  )
  assert.equal(sends, 1)
  assert.deepEqual(
    (await notificationRecords().findOne({ _id: history[0] }))?.notification,
    before?.notification
  )
  await notificationRecords().updateOne(
    { _id: history[0] },
    { $set: { 'notification.attempts': 4 } }
  )
  assert.equal(await worker.sendProductNotification(history[0]), 'skipped')
  const dto = (await writes.listForAdmin()).find(
    row => row.product.id === history[0]
  )!
  assert.equal(dto.notification?.channel, null)
})

test('a real database outage is unavailable, never an empty storefront or missing product', async () => {
  await db.connectDatabase(uri)
  const exited = once(mongod, 'exit')
  mongod.kill()
  await exited
  await assert.rejects(products.list(), { status: 503 })
  await assert.rejects(products.get('hidden'), { status: 503 })
  const writes = (
    await import('../../src/services/mongodb-products.js')
  ).createMongoProductsService()
  await assert.rejects(
    writes.create(
      {
        name: 'Offline',
        price: 1,
        description: '',
        category: '',
        images: [],
      },
      { userId: 'offline_admin', role: 'admin' }
    ),
    { status: 503 }
  )
  await assert.rejects(
    writes.update(
      'hidden',
      { price: 1 },
      { userId: 'offline_admin', role: 'admin' }
    ),
    { status: 503 }
  )
  await assert.rejects(
    writes.remove('hidden', { userId: 'offline_admin', role: 'admin' }),
    { status: 503 }
  )
  await assert.rejects(writes.listOwned('offline_user'), { status: 503 })
  await assert.rejects(writes.listForAdmin(), { status: 503 })
  const { createMongoFavoritesService } =
    await import('../../src/services/mongodb-favorites.js')
  await assert.rejects(
    createMongoFavoritesService(db.database).get('user_fav_a'),
    { status: 503 }
  )
})
