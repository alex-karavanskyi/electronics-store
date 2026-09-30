import assert from 'node:assert/strict'
import { test } from 'node:test'
import { once } from 'node:events'
import { createVercelApp } from '../src/vercel.js'

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
