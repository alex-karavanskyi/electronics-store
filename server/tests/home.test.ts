import assert from 'node:assert/strict'
import { test } from 'node:test'
import { once } from 'node:events'
import { createApp } from '../src/app.js'
import { parseEnv } from '../src/config/env.js'

test('home uses the compact service without loading full products or treating home as an ID', async () => {
  const payload = {
    categories: ['phones', ''],
    featured: [{ id: 'one', name: 'Phone', image: '/one.png' }],
  }
  const server = createApp({
    config: parseEnv({ MONGODB_URI: 'mongodb://127.0.0.1/test' }),
    products: {
      list: async () => {
        throw new Error('Full catalog must not be read')
      },
      get: async () => {
        throw new Error('Home is not a product ID')
      },
      home: async () => payload,
    },
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const port = (server.address() as import('node:net').AddressInfo).port
    const response = await fetch(`http://127.0.0.1:${port}/api/products/home`)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.deepEqual(await response.json(), payload)
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})
