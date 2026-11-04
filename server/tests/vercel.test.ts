import assert from 'node:assert/strict'
import { test } from 'node:test'
import { once } from 'node:events'
import { createVercelApp } from '../src/vercel.js'
import { database } from '../src/config/database.js'

test('startup diagnostics identify invalid settings without exposing their values', async t => {
  const log = t.mock.method(console, 'error', () => {})
  const server = createVercelApp({
    MONGODB_URI: 'mongodb://user:private-password@localhost/test',
    PRODUCT_NOTIFICATIONS_CRON_SECRET: 'private-short-secret',
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const address = server.address() as import('node:net').AddressInfo
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/products`
    )
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), {
      error: 'Product service unavailable',
    })
    assert.deepEqual(
      log.mock.calls.map(call => call.arguments),
      [
        [
          'API initialization failed',
          {
            stage: 'environment',
            invalidVariables: ['PRODUCT_NOTIFICATIONS_CRON_SECRET'],
          },
        ],
      ]
    )
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

test('database startup logs classify authentication errors and never log raw errors', async t => {
  const log = t.mock.method(console, 'error', () => {})
  t.mock.method(database, 'openUri', async () => {
    throw Object.assign(
      new Error('mongodb://user:private-password@private-host/test'),
      {
        name: 'MongoServerError',
        code: 18,
      }
    )
  })
  const server = createVercelApp({
    MONGODB_URI: 'mongodb://localhost/test',
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const address = server.address() as import('node:net').AddressInfo
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/products`
    )
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), {
      error: 'Product service unavailable',
    })
    assert.deepEqual(
      log.mock.calls.map(call => call.arguments),
      [
        ['MongoDB connection failed', { category: 'authentication' }],
        ['API initialization failed', { stage: 'runtime' }],
      ]
    )
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})

test('Vercel returns a safe 503 when MongoDB configuration is missing or invalid', async () => {
  for (const env of [{}, { MONGODB_URI: 'secret-invalid-uri' }]) {
    const server = createVercelApp(env).listen(0, '127.0.0.1')
    await once(server, 'listening')
    const address = server.address() as import('node:net').AddressInfo
    try {
      const response = await fetch(
        'http://127.0.0.1:' + address.port + '/api/products'
      )
      assert.equal(response.status, 503)
      assert.match(response.headers.get('cache-control')!, /no-store/)
      assert.deepEqual(await response.json(), {
        error: 'Product service unavailable',
      })
    } finally {
      server.closeAllConnections()
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
  }
})
