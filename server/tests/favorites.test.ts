import assert from 'node:assert/strict'
import { once } from 'node:events'
import { test } from 'node:test'
import { createApp } from '../src/app.js'
import { authConfig, sessionToken } from './support/auth.js'

test('favorites endpoints authenticate through Clerk and scope every operation to the verified user', async () => {
  const calls: unknown[][] = []
  const result = { ids: ['phone / one'], revision: 3 }
  const record =
    (name: string) =>
    async (...args: unknown[]) => {
      calls.push([name, ...args])
      return result
    }
  const app = createApp({
    config: authConfig,
    serveClient: false,
    products: {
      list: async () => [],
      get: async () => {
        throw new Error('unused')
      },
    },
    favorites: {
      get: record('get'),
      add: record('add'),
      remove: record('remove'),
      merge: record('merge'),
      reorder: record('reorder'),
    },
  })
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base =
    'http://127.0.0.1:' +
    (server.address() as import('node:net').AddressInfo).port +
    '/api/me/favorites'
  const request = (
    path = '',
    method = 'GET',
    body?: unknown,
    token = sessionToken()
  ) =>
    fetch(base + path, {
      method,
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
        'X-User-Id': 'user_attacker',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  try {
    for (const bearer of [
      '',
      'invalid',
      sessionToken('user_one', { exp: 1 }),
    ]) {
      for (const [path, method, body] of [
        ['', 'GET', undefined],
        ['/items/one', 'PUT', {}],
        ['/items/one', 'DELETE', {}],
        ['/merge', 'POST', { ids: ['one'], batchId: 'batch-1' }],
        ['/order', 'PUT', { ids: ['one'], revision: 0 }],
      ] as const) {
        const response = await request(path, method, body, bearer)
        assert.equal(response.status, 401)
        assert.match(
          response.headers.get('cache-control')!,
          /private.*no-store/
        )
      }
    }
    assert.equal(calls.length, 0)
    for (const [path, method, body, expected] of [
      ['?userId=user_attacker', 'GET', undefined, ['get', 'user_one']],
      ['/items/order', 'PUT', {}, ['add', 'user_one', 'order']],
      [
        '/items/phone%20%2F%20one',
        'PUT',
        {},
        ['add', 'user_one', 'phone / one'],
      ],
      [
        '/items/phone%20%2F%20one',
        'DELETE',
        {},
        ['remove', 'user_one', 'phone / one'],
      ],
      [
        '/merge',
        'POST',
        { ids: ['one', 'one'], batchId: 'batch-1' },
        ['merge', 'user_one', { ids: ['one'], batchId: 'batch-1' }],
      ],
      [
        '/order',
        'PUT',
        { ids: ['one'], revision: 3 },
        ['reorder', 'user_one', { ids: ['one'], revision: 3 }],
      ],
    ] as const) {
      const response = await request(path, method, body)
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), result)
      assert.deepEqual(calls.at(-1), expected)
    }
    await request(
      '',
      'GET',
      undefined,
      sessionToken('user_two', { role: 'admin' })
    )
    assert.deepEqual(calls.at(-1), ['get', 'user_two'])
    const count = calls.length
    for (const [path, method, body] of [
      ['/items/demo_one', 'PUT', {}],
      ['/items/demo:one', 'DELETE', {}],
      ['/items/%20', 'PUT', {}],
      ['/items/one', 'PUT', { userId: 'user_attacker' }],
      ['/merge', 'POST', { ids: [{ $ne: null }], batchId: 'batch-2' }],
      ['/merge', 'POST', { ids: ['one'], batchId: 'batch-2', role: 'admin' }],
      [
        '/merge',
        'POST',
        {
          ids: Array.from({ length: 501 }, (_, i) => String(i)),
          batchId: 'batch-2',
        },
      ],
      ['/order', 'PUT', { ids: ['one', 'one'], revision: 3 }],
      ['/order', 'PUT', { ids: ['one'], revision: -1 }],
    ] as const)
      assert.equal((await request(path, method, body)).status, 400)
    assert.equal(calls.length, count)
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})
