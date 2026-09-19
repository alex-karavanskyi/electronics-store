import assert from 'node:assert/strict'
import { test } from 'node:test'
import { once } from 'node:events'
import { createApp } from '../src/app.js'
import { parseEnv } from '../src/config/env.js'
import { selectCatalog } from '../src/services/catalog.js'
const products = Array.from({ length: 14 }, (_, i) => ({
  id: String(i),
  name: 'Phone ' + String(i).padStart(2, '0'),
  price: i * 10,
  category: i % 2 ? 'phones' : 'laptops',
  description: '',
  image: '',
  images: [],
}))
test('catalog endpoint applies filters, sorting and pagination without changing legacy list', async () => {
  const config = parseEnv({
    AIRTABLE_API_KEY: 'test',
    AIRTABLE_BASE_ID: 'base',
    AIRTABLE_TABLE_NAME: 'table',
  })
  const server = createApp({
    config,
    products: { list: async () => products, get: async () => products[0] },
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const url =
    'http://127.0.0.1:' +
    (server.address() as import('node:net').AddressInfo).port
  try {
    const response = await fetch(
      url +
        '/api/products/catalog?text=phONe&category=phones&price=110&sort=price-highest&page=2&pageSize=2'
    )
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      items: [products[7], products[5]],
      total: 6,
      page: 2,
      pageSize: 2,
      min_price: 0,
      max_price: 130,
    })
    assert.deepEqual(
      await fetch(url + '/api/products').then(r => r.json()),
      products
    )
  } finally {
    server.closeAllConnections()
    await new Promise<void>(resolve => server.close(() => resolve()))
  }
})
test('invalid criteria have defaults; empty results and excessive pages are safe', () => {
  const result = selectCatalog(
    products,
    new URLSearchParams('price=-1&sort=invalid&page=Infinity&pageSize=-1')
  )
  assert.equal(result.page, 1)
  assert.equal(result.pageSize, 6)
  assert.equal(result.total, 14)
  assert.equal(selectCatalog(products, new URLSearchParams('page=99')).page, 3)
  assert.equal(selectCatalog(products, new URLSearchParams('price=0')).total, 1)
  assert.equal(
    selectCatalog(products, new URLSearchParams('category=unknown')).total,
    0
  )
  assert.deepEqual(selectCatalog([], new URLSearchParams()), {
    items: [],
    total: 0,
    page: 1,
    pageSize: 6,
    min_price: 0,
    max_price: 0,
  })
})
for (const [sort, ids] of [
  ['price-lowest', ['0', '1']],
  ['price-highest', ['13', '12']],
  ['name-a', ['0', '1']],
  ['name-z', ['13', '12']],
] as const)
  test('sort ' + sort, () => {
    assert.deepEqual(
      selectCatalog(
        products,
        new URLSearchParams({ sort, pageSize: '2' })
      ).items.map(p => p.id),
      ids
    )
    assert.equal(products[0].id, '0')
  })
