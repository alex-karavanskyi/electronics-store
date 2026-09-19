import assert from 'node:assert/strict'
import { test } from 'node:test'
import { once } from 'node:events'
import { createApp } from '../src/app.js'
import { createProductsService } from '../src/services/products.js'
import { parseEnv } from '../src/config/env.js'

const config = parseEnv({
  AIRTABLE_API_KEY: 'test-secret',
  AIRTABLE_BASE_ID: 'base',
  AIRTABLE_TABLE_NAME: 'Products',
})
const record = {
  id: 'rec1',
  fields: {
    name: 'Phone',
    price: 125,
    description: 'Description',
    category: 'phones',
    images: '["/phone.png"]',
  },
}
async function withApi(
  upstream: typeof fetch,
  run: (url: string) => Promise<void>
) {
  const server = createApp({
    config,
    products: createProductsService(config, upstream),
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

test('products preserve contracts, sorting and encoded record IDs', async () => {
  const upstream: typeof fetch = async (url, init) => {
    assert.equal(
      new Headers(init?.headers).get('Authorization'),
      'Bearer test-secret'
    )
    const parsed = new URL(String(url))
    if (parsed.search) {
      assert.equal(parsed.searchParams.get('maxRecords'), '28')
      assert.equal(parsed.searchParams.get('sort[0][direction]'), 'asc')
      return Response.json({ records: [record] })
    }
    assert.ok(parsed.pathname.endsWith('/phone%20one'))
    return Response.json(record)
  }
  await withApi(upstream, async url => {
    const list = await fetch(url + '/api/products')
    assert.equal(list.status, 200)
    assert.match(list.headers.get('cache-control')!, /no-store/)
    const products =
      (await list.json()) as import('../src/services/products.js').Product[]
    assert.equal(products[0].image, '/phone.png')
    assert.equal(products[0].price, 125)
    const detail = await fetch(url + '/api/products/phone%20one')
    assert.deepEqual(await detail.json(), products[0])
  })
})

test('CORS permits configured origins and preflight; rejects other origins', async () => {
  await withApi(
    async () => Response.json({ records: [] }),
    async url => {
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
    }
  )
})

for (const [upstreamStatus, expected] of [
  [404, 404],
  [401, 502],
  [429, 503],
  [500, 502],
]) {
  test(
    'maps upstream status ' + upstreamStatus + ' without leaking details',
    async () => {
      await withApi(
        async () => new Response('test-secret', { status: upstreamStatus }),
        async url => {
          const response = await fetch(url + '/api/products/rec1')
          assert.equal(response.status, expected)
          assert.ok(!(await response.text()).includes('test-secret'))
        }
      )
    }
  )
}

test('invalid upstream payload and network failure return safe errors', async () => {
  for (const upstream of [
    async () =>
      Response.json({
        records: [
          { ...record, fields: { ...record.fields, images: 'broken' } },
        ],
      }),
    async () => {
      throw new Error('test-secret')
    },
  ]) {
    await withApi(upstream, async url => {
      const response = await fetch(url + '/api/products')
      assert.equal(response.status, 502)
      assert.ok(!(await response.text()).includes('test-secret'))
    })
  }
})

test('JSON errors, missing endpoints, oversized bodies and unavailable chat', async () => {
  await withApi(
    async () => Response.json(record),
    async url => {
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
    }
  )
})

test('environment validates ports, origins and required credentials without logging values', () => {
  assert.throws(() => parseEnv({}), /AIRTABLE/)
  assert.throws(
    () =>
      parseEnv({
        AIRTABLE_API_KEY: 'secret',
        AIRTABLE_BASE_ID: 'base',
        AIRTABLE_TABLE_NAME: 'table',
        PORT: 'invalid',
      }),
    /PORT/
  )
  assert.throws(
    () =>
      parseEnv({
        AIRTABLE_API_KEY: 'secret',
        AIRTABLE_BASE_ID: 'base',
        AIRTABLE_TABLE_NAME: 'table',
        CORS_ORIGINS: '*',
      }),
    /CORS_ORIGINS/
  )
})

test('rejects invalid product prices and IDs consistently across product endpoints', async () => {
  for (const invalid of [
    { ...record, fields: { ...record.fields, price: -5 } },
    { ...record, fields: { ...record.fields, price: '125' } },
    { ...record, id: '' },
    { ...record, id: '   ' },
    { ...record, id: 'x'.repeat(201) },
  ]) {
    await withApi(
      async upstreamUrl =>
        new URL(String(upstreamUrl)).search
          ? Response.json({ records: [invalid] })
          : Response.json(invalid),
      async url => {
        for (const path of [
          '/api/products',
          '/api/products/catalog',
          '/api/products/rec1',
        ]) {
          const response = await fetch(url + path)
          assert.equal(response.status, 502)
          assert.deepEqual(await response.json(), {
            error: 'Invalid product service response',
          })
        }
      }
    )
  }
})
test('accepts zero and fractional prices and normalizes missing optional product fields', async () => {
  for (const price of [0, 125.5]) {
    await withApi(
      async () =>
        Response.json({ id: 'rec1', fields: { name: 'Phone', price } }),
      async url => {
        const response = await fetch(url + '/api/products/rec1')
        assert.equal(response.status, 200)
        assert.deepEqual(await response.json(), {
          id: 'rec1',
          name: 'Phone',
          price,
          description: '',
          category: '',
          images: [],
          image: '',
        })
      }
    )
  }
})

test('CORS does not reject requests outside the API', async () => {
  await withApi(
    async () => Response.json({ records: [] }),
    async url => {
      const response = await fetch(url + '/client-route', {
        method: 'POST',
        headers: { Origin: 'https://electronics-store-523e.onrender.com' },
      })
      assert.equal(response.status, 404)
      assert.deepEqual(await response.json(), { error: 'Endpoint not found' })
    }
  )
})