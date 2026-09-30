import assert from 'node:assert/strict'
import { test } from 'node:test'
import { once } from 'node:events'
import { createApp } from '../src/app.js'
import type { ProductsService } from '../src/services/products.js'
import { HttpError } from '../src/middleware/errors.js'
import { parseEnv } from '../src/config/env.js'

const config = parseEnv({
  MONGODB_URI: 'mongodb://127.0.0.1:27017/test',
})
const product = {
  id: 'phone one',
  name: 'Phone',
  price: 125,
  description: 'Description',
  category: 'phones',
  images: ['/phone.png'],
  image: '/phone.png',
}
const products: ProductsService = {
  list: async () => [product],
  get: async id => {
    if (id !== product.id && id !== 'rec1')
      throw new HttpError(404, 'Product not found')
    return product
  },
}
async function withApi(
  products: ProductsService,
  run: (url: string) => Promise<void>
) {
  const server = createApp({
    config,
    products,
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address() as import('node:net').AddressInfo
  try {
    await run('http://127.0.0.1:' + address.port)
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
}

test('product routes preserve the DTO and decode record IDs', async () => {
  await withApi(products, async url => {
    const list = await fetch(url + '/api/products')
    assert.equal(list.status, 200)
    assert.match(list.headers.get('cache-control')!, /no-store/)
    assert.deepEqual(await list.json(), [product])
    const detail = await fetch(url + '/api/products/phone%20one')
    assert.equal(detail.status, 200)
    assert.deepEqual(await detail.json(), product)
    assert.equal((await fetch(url + '/api/products/unknown')).status, 404)
  })
})

test('CORS permits configured origins and preflight; rejects other origins', async () => {
  await withApi(products, async url => {
    const good = await fetch(url + '/api/products', {
      headers: { Origin: 'http://localhost:5173' },
    })
    assert.equal(
      good.headers.get('access-control-allow-origin'),
      'http://localhost:5173'
    )
    const preflight = await fetch(url + '/api/chat', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    })
    assert.equal(preflight.status, 204)
    const bad = await fetch(url + '/api/products', {
      headers: { Origin: 'https://untrusted.example' },
    })
    assert.equal(bad.status, 403)
    assert.equal(bad.headers.get('access-control-allow-origin'), null)
  })
})

test('JSON errors, missing endpoints, oversized bodies and unavailable chat', async () => {
  await withApi(products, async url => {
    assert.equal((await fetch(url + '/api/unknown')).status, 404)
    assert.equal(
      (
        await fetch(url + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{',
        })
      ).status,
      400
    )
    assert.equal(
      (
        await fetch(url + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: 'x'.repeat(270000) }),
        })
      ).status,
      413
    )
    assert.equal(
      (
        await fetch(url + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [] }),
        })
      ).status,
      400
    )
    assert.equal(
      (
        await fetch(url + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              {
                id: 'm1',
                role: 'user',
                parts: [{ type: 'text', text: 'Price?' }],
                metadata: { productId: 'rec1' },
              },
            ],
          }),
        })
      ).status,
      503
    )
  })
})

test('environment validates ports, origins and required credentials without logging values', () => {
  assert.throws(() => parseEnv({}), /MONGODB_URI/)
  assert.throws(
    () =>
      parseEnv({
        MONGODB_URI: 'mongodb://127.0.0.1:27017/test',
        PORT: 'invalid',
      }),
    /PORT/
  )
  assert.throws(
    () =>
      parseEnv({
        MONGODB_URI: 'mongodb://127.0.0.1:27017/test',
        CORS_ORIGINS: '*',
      }),
    /CORS_ORIGINS/
  )
})

test('CORS does not reject requests outside the API', async () => {
  await withApi(products, async url => {
    const response = await fetch(url + '/client-route', {
      method: 'POST',
      headers: { Origin: 'https://electronics-store-523e.onrender.com' },
    })
    assert.equal(response.status, 404)
    assert.deepEqual(await response.json(), { error: 'Endpoint not found' })
  })
})
