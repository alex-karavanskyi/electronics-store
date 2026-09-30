import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer, type AddressInfo } from 'node:net'
import { once } from 'node:events'
import { parseEnv } from '../../src/config/env.js'

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

test('a real database outage is unavailable, never an empty storefront or missing product', async () => {
  await db.connectDatabase(uri)
  const exited = once(mongod, 'exit')
  mongod.kill()
  await exited
  await assert.rejects(products.list(), { status: 503 })
  await assert.rejects(products.get('hidden'), { status: 503 })
})
