import assert from 'node:assert/strict'
import { once } from 'node:events'
import { test } from 'node:test'
import { createApp } from '../src/app.js'
import { authConfig, sessionToken } from './support/auth.js'
import { parseEnv } from '../src/config/env.js'
import { HttpError } from '../src/middleware/errors.js'

const product = {
  id: 'legacy',
  name: 'Original',
  price: 10,
  description: '',
  category: '',
  images: [],
  image: '',
}
async function fixture(config = authConfig, available = true, fail = false) {
  let calls = 0
  const rows = [{ product, ownerId: null, createdAt: null }]
  const server = createApp({
    config,
    serveClient: false,
    products: { list: async () => [product], get: async () => product },
    adminProducts: available
      ? {
          listForAdmin: async () => {
            calls++
            if (fail)
              throw new HttpError(
                503,
                'Product service temporarily unavailable'
              )
            return rows
          },
        }
      : undefined,
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base =
    'http://127.0.0.1:' +
    (server.address() as import('node:net').AddressInfo).port
  return {
    calls: () => calls,
    rows,
    get: (bearer = '', path = '/api/admin/products') =>
      fetch(base + path, {
        redirect: 'manual',
        headers: { Authorization: 'Bearer ' + bearer, 'X-Role': 'admin' },
      }),
    close: async () => {
      server.closeAllConnections()
      await new Promise<void>(resolve => server.close(() => resolve()))
    },
  }
}
test('administrative list rejects guests, invalid tokens and ordinary users before calling the service', async () => {
  const app = await fixture()
  try {
    for (const [token, status] of [
      ['', 401],
      ['invalid', 401],
      [sessionToken('a', { role: 'admin', exp: 1 }), 401],
      [sessionToken('a'), 403],
      [sessionToken('a', { role: 'Admin' }), 403],
      [sessionToken('a', { publicMetadata: { role: 'admin' } }), 403],
    ] as const) {
      const response = await app.get(
        token,
        '/api/admin/products?role=admin&userId=owner'
      )
      assert.equal(response.status, status)
      assert.match(response.headers.get('cache-control')!, /private.*no-store/)
      assert.equal(response.headers.get('location'), null)
    }
    assert.equal(app.calls(), 0)
  } finally {
    await app.close()
  }
})
test('verified Admin gets the dedicated DTO; public reads stay unchanged and new user-role tokens lose access', async () => {
  const app = await fixture()
  try {
    const response = await app.get(sessionToken('a', { role: 'admin' }))
    assert.equal(response.status, 200)
    assert.match(response.headers.get('cache-control')!, /private.*no-store/)
    assert.deepEqual(await response.json(), app.rows)
    assert.deepEqual(await (await app.get('', '/api/products')).json(), [
      product,
    ])
    assert.equal((await app.get(sessionToken('a'))).status, 403)
    assert.equal(app.calls(), 1)
  } finally {
    await app.close()
  }
})
test('missing Clerk, missing service and service outages fail closed instead of returning an empty list', async () => {
  for (const [config, available, fail] of [
    [parseEnv({ MONGODB_URI: 'mongodb://127.0.0.1/test' }), true, false],
    [authConfig, false, false],
    [authConfig, true, true],
  ] as const) {
    const app = await fixture(config, available, fail)
    try {
      assert.equal(
        (await app.get(sessionToken('a', { role: 'admin' }))).status,
        503
      )
    } finally {
      await app.close()
    }
  }
})
