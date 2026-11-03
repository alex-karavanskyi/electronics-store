import assert from 'node:assert/strict'
import { once } from 'node:events'
import { test } from 'node:test'
import { createApp } from '../src/app.js'
import { authConfig, sessionToken } from './support/auth.js'

const product = {
  id: 'prod_notification',
  name: 'Phone',
  price: 10,
  description: '',
  category: '',
  images: [],
  image: '',
}
async function fixture(fail = false) {
  let sent = 0
  let processed = 0
  let retried = 0
  const server = createApp({
    config: {
      ...authConfig,
      PRODUCT_NOTIFICATIONS_CRON_SECRET: 'fixture-secret-long-enough-for-test',
    },
    products: { list: async () => [product], get: async () => product },
    productWrites: {
      create: async () => product,
      update: async () => product,
      remove: async () => {},
    },
    notifications: {
      sendProductNotification: async () => {
        sent++
        if (fail) throw new Error('provider secret must not escape')
        return 'sent' as const
      },
      processProductNotifications: async () => {
        processed++
        return { processed: 1 }
      },
      retry: async () => {
        retried++
        return 'sent' as const
      },
    },
    serveClient: false,
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base =
    'http://127.0.0.1:' +
    (server.address() as import('node:net').AddressInfo).port
  return {
    counts: () => ({ sent, processed, retried }),
    request: (path: string, token = '', method = 'GET', body?: object) =>
      fetch(base + path, {
        method,
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
    close: async () => {
      server.closeAllConnections()
      await new Promise<void>(resolve => server.close(() => resolve()))
    },
  }
}

test('POST awaits one notification attempt; provider failure does not undo publication; PATCH never sends', async () => {
  const app = await fixture(true)
  try {
    const response = await app.request(
      '/api/products',
      sessionToken('author'),
      'POST',
      { name: 'Phone', price: 10, description: '', category: '', images: [] }
    )
    assert.equal(response.status, 201)
    assert.deepEqual(await response.json(), product)
    assert.equal(app.counts().sent, 1)
    assert.equal(
      (
        await app.request(
          '/api/products/' + product.id,
          sessionToken('author'),
          'PATCH',
          { name: 'Edited' }
        )
      ).status,
      200
    )
    assert.equal(app.counts().sent, 1)
  } finally {
    await app.close()
  }
})

test('cron requires its own bearer secret, is not public/cacheable and supports repeated invocations', async () => {
  const app = await fixture()
  try {
    for (const token of [
      '',
      'wrong',
      sessionToken('admin', { role: 'admin' }),
    ]) {
      assert.equal(
        (await app.request('/api/internal/product-notifications', token))
          .status,
        401
      )
    }
    assert.equal(app.counts().processed, 0)
    for (let i = 0; i < 2; i++) {
      const response = await app.request(
        '/api/internal/product-notifications',
        'fixture-secret-long-enough-for-test'
      )
      assert.equal(response.status, 200)
      assert.match(response.headers.get('cache-control')!, /private.*no-store/)
      assert.deepEqual(await response.json(), { processed: 1 })
    }
  } finally {
    await app.close()
  }
})

test('manual notification retry is Admin-only and rejects client-supplied recipient/settings', async () => {
  const app = await fixture()
  const path = '/api/admin/products/' + product.id + '/notification/retry'
  try {
    assert.equal((await app.request(path, '', 'POST')).status, 401)
    assert.equal(
      (await app.request(path, sessionToken('user'), 'POST')).status,
      403
    )
    assert.equal(app.counts().retried, 0)
    const admin = sessionToken('admin', { role: 'admin' })
    assert.equal(
      (await app.request(path, admin, 'POST', { to: 'attacker@example.test' }))
        .status,
      400
    )
    const response = await app.request(path, admin, 'POST')
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { status: 'sent' })
    assert.equal(app.counts().retried, 1)
  } finally {
    await app.close()
  }
})
