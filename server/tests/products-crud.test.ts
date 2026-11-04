import assert from 'node:assert/strict'
import { once } from 'node:events'
import { test } from 'node:test'
import { createApp } from '../src/app.js'
import { authConfig, sessionToken } from './support/auth.js'
import { parseEnv } from '../src/config/env.js'
import { HttpError } from '../src/middleware/errors.js'

const product = {
  id: 'phone / one',
  name: 'Phone',
  price: 10,
  description: '',
  category: '',
  images: [],
  image: '',
}
type Actor = { userId: string; role: 'user' | 'admin' }
const adminActor: Actor = { userId: 'admin_one', role: 'admin' }

async function fixture(config = authConfig) {
  const calls: unknown[][] = []
  const app = createApp({
    config,
    serveClient: false,
    products: { list: async () => [product], get: async () => product },
    ownedProducts: {
      listOwned: async (userId: string) => {
        calls.push(['listOwned', userId])
        return userId === 'user_a' ? [product] : []
      },
    },
    productWrites: {
      create: async (input: unknown, actor: Actor) => {
        calls.push(['create', input, actor])
        return product
      },
      update: async (id: string, input: unknown, actor: Actor) => {
        calls.push(['update', id, input, actor])
        if (id === 'missing') throw new HttpError(404, 'Product not found')
        return product
      },
      remove: async (id: string, actor: Actor) => {
        calls.push(['remove', id, actor])
        if (id === 'missing') throw new HttpError(404, 'Product not found')
      },
    },
  })
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base =
    'http://127.0.0.1:' +
    (server.address() as import('node:net').AddressInfo).port +
    '/api/products'
  return {
    calls,
    personal: (token = '', query = '') =>
      fetch(base.replace('/api/products', '/api/me/products') + query, {
        headers: { Authorization: 'Bearer ' + token },
      }),
    request: (
      path: string,
      method: string,
      body?: unknown,
      token = sessionToken('admin_one', { role: 'admin' })
    ) =>
      fetch(base + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
          'X-Role': 'admin',
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    close: async () => {
      server.closeAllConnections()
      await new Promise<void>(resolve => server.close(() => resolve()))
    },
  }
}

test('persists uploaded image data larger than the default JSON limit', async () => {
  const app = await fixture()
  try {
    const image =
      'data:image/png;base64,' + Buffer.alloc(300000).toString('base64')
    const response = await app.request('', 'POST', {
      name: 'Photo',
      price: 1,
      images: [image],
    })
    assert.equal(response.status, 201)
    assert.deepEqual((app.calls[0][1] as { images: string[] }).images, [image])
  } finally {
    await app.close()
  }
})

test('product mutations require a verified session while product reads remain public', async () => {
  const app = await fixture()
  try {
    for (const [token, status] of [
      ['', 401],
      ['invalid', 401],
      [sessionToken('admin', { role: 'admin', exp: 1 }), 401],
    ] as const) {
      for (const [path, method, input] of [
        ['', 'POST', { name: 'New', price: 1 }],
        ['/one', 'PATCH', { price: 1 }],
        ['/one', 'DELETE', undefined],
      ] as const) {
        const response = await app.request(path, method, input, token)
        assert.equal(response.status, status)
        assert.match(
          response.headers.get('cache-control')!,
          /private.*no-store/
        )
      }
    }
    assert.deepEqual(app.calls, [])
    assert.equal((await app.request('', 'GET', undefined, '')).status, 200)
  } finally {
    await app.close()
  }
})

test('admin CRUD normalizes allowed input, preserves encoded IDs and returns documented statuses', async () => {
  const app = await fixture()
  try {
    const created = await app.request('', 'POST', {
      name: '  New phone  ',
      price: 0,
    })
    assert.equal(created.status, 201)
    assert.deepEqual(await created.json(), product)
    assert.deepEqual(app.calls.at(-1), [
      'create',
      {
        name: 'New phone',
        price: 0,
        description: '',
        category: '',
        images: [],
      },
      adminActor,
    ])
    const edited = await app.request('/phone%20%2F%20one', 'PATCH', {
      category: ' phones ',
      images: [],
    })
    assert.equal(edited.status, 200)
    assert.deepEqual(await edited.json(), product)
    assert.deepEqual(app.calls.at(-1), [
      'update',
      'phone / one',
      { category: 'phones', images: [] },
      adminActor,
    ])
    const removed = await app.request('/phone%20%2F%20one', 'DELETE')
    assert.equal(removed.status, 204)
    assert.equal(await removed.text(), '')
    assert.deepEqual(app.calls.at(-1), ['remove', 'phone / one', adminActor])
    for (const method of ['PATCH', 'DELETE'])
      assert.equal(
        (
          await app.request(
            '/missing',
            method,
            method === 'PATCH' ? { price: 1 } : undefined
          )
        ).status,
        404
      )
  } finally {
    await app.close()
  }
})

test('CRUD rejects malformed fields, mass assignment, unsafe image URLs and demo IDs before writing', async () => {
  const app = await fixture()
  try {
    const invalid = [
      { name: '' },
      { name: '   ' },
      { name: 'x'.repeat(201) },
      { price: -1 },
      { price: '10' },
      { price: 1_000_000_001 },
      { description: null },
      { description: 'x'.repeat(10001) },
      { category: 'x'.repeat(101) },
      { images: null },
      { images: ['not a URL'] },
      { images: ['https://'] },
      { images: [''] },
      { images: ['javascript:alert(1)'] },
      { images: ['data:image/png;base64,abc'] },
      { images: ['http://example.com/a.png'] },
      { images: ['https://user:secret@example.com/a.png'] },
      { images: ['https://example.com/a.png', 'https://example.com/a.png'] },
      {
        images: Array.from(
          { length: 21 },
          (_, i) => 'https://example.com/' + i + '.png'
        ),
      },
      { images: ['https://example.com/' + 'a'.repeat(2048)] },
      { images: [{ secureUrl: 'https://example.com/a.png' }] },
      ...[
        'id',
        '_id',
        'userId',
        'ownerId',
        'role',
        'source',
        'sourceHash',
        'catalogOrder',
        'createdAt',
        'imageUrls',
        'image',
        '__proto__',
      ].map(
        key => JSON.parse('{"' + key + '":"forged"}') as Record<string, unknown>
      ),
      { $set: { price: 0 } },
      { 'images.0': 'https://example.com/x.png' },
    ]
    for (const body of invalid) {
      assert.equal(
        (await app.request('', 'POST', { name: 'Phone', price: 1, ...body }))
          .status,
        400,
        JSON.stringify(body)
      )
      assert.equal(
        (await app.request('/one', 'PATCH', body)).status,
        400,
        JSON.stringify(body)
      )
    }
    for (const body of [{}, [], null, 'text'])
      assert.equal((await app.request('/one', 'PATCH', body)).status, 400)
    assert.equal((await app.request('', 'POST', { price: 1 })).status, 400)
    assert.equal((await app.request('', 'POST', { name: 'Phone' })).status, 400)
    assert.equal(
      (await app.request('/one', 'DELETE', { ownerId: 'someone' })).status,
      400
    )
    for (const id of ['%20', 'x'.repeat(201), 'demo_one', 'demo:one'])
      for (const method of ['PATCH', 'DELETE'])
        assert.equal(
          (
            await app.request(
              '/' + id,
              method,
              method === 'PATCH' ? { price: 1 } : undefined
            )
          ).status,
          400
        )
    assert.deepEqual(app.calls, [])
  } finally {
    await app.close()
  }
})

test('product mutations fail closed when Clerk is not configured', async () => {
  const app = await fixture(
    parseEnv({ MONGODB_URI: 'mongodb://127.0.0.1:27017/test' })
  )
  try {
    assert.equal(
      (await app.request('', 'POST', { name: 'Phone', price: 1 })).status,
      503
    )
    assert.equal((await app.request('/one', 'PATCH', { price: 1 })).status, 503)
    assert.equal((await app.request('/one', 'DELETE')).status, 503)
    assert.deepEqual(app.calls, [])
  } finally {
    await app.close()
  }
})

test('users can write and actor comes only from verified session claims', async () => {
  const app = await fixture()
  try {
    for (const claims of [
      {},
      { role: 'Admin' },
      { publicMetadata: { role: 'admin' } },
    ]) {
      const token = sessionToken('user_a', claims)
      assert.equal(
        (await app.request('', 'POST', { name: 'User phone', price: 1 }, token))
          .status,
        201
      )
      assert.deepEqual(app.calls.at(-1)?.at(-1), {
        userId: 'user_a',
        role: 'user',
      })
      assert.equal(
        (await app.request('/one', 'PATCH', { price: 2 }, token)).status,
        200
      )
      assert.deepEqual(app.calls.at(-1), [
        'update',
        'one',
        { price: 2 },
        { userId: 'user_a', role: 'user' },
      ])
      assert.equal(
        (await app.request('/one', 'DELETE', undefined, token)).status,
        204
      )
      assert.deepEqual(app.calls.at(-1), [
        'remove',
        'one',
        { userId: 'user_a', role: 'user' },
      ])
      for (const field of ['ownerId', 'role']) {
        const count = app.calls.length
        assert.equal(
          (
            await app.request(
              '',
              'POST',
              { name: 'Forged', price: 1, [field]: 'admin' },
              token
            )
          ).status,
          400
        )
        assert.equal(
          (await app.request('/one', 'PATCH', { [field]: 'admin' }, token))
            .status,
          400
        )
        assert.equal(app.calls.length, count)
      }
    }
  } finally {
    await app.close()
  }
})

test('personal products authenticate and use the session subject, ignoring query user IDs', async () => {
  const app = await fixture()
  try {
    for (const token of ['', 'invalid', sessionToken('user_a', { exp: 1 })]) {
      assert.equal((await app.personal(token)).status, 401)
    }
    assert.deepEqual(app.calls, [])
    const a = await app.personal(
      sessionToken('user_a'),
      '?userId=user_b&ownerId=user_b'
    )
    assert.equal(a.status, 200)
    assert.match(a.headers.get('cache-control')!, /private.*no-store/)
    assert.deepEqual(await a.json(), [product])
    assert.deepEqual(app.calls.at(-1), ['listOwned', 'user_a'])
    const b = await app.personal(sessionToken('user_b'), '?userId=user_a')
    assert.deepEqual(await b.json(), [])
    assert.deepEqual(app.calls.at(-1), ['listOwned', 'user_b'])
  } finally {
    await app.close()
  }
  const unavailable = await fixture(
    parseEnv({ MONGODB_URI: 'mongodb://127.0.0.1:27017/test' })
  )
  try {
    assert.equal(
      (await unavailable.personal(sessionToken('user_a'))).status,
      503
    )
    assert.deepEqual(unavailable.calls, [])
  } finally {
    await unavailable.close()
  }
})
