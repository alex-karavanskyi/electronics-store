import { mockFetch, jsonResponse } from '../support/fetch'
import {
  fetchCatalog,
  fetchProduct,
  fetchProducts,
} from '@/shared/api/products'
import { ApiError } from '@/shared/api/http'
import { createQueryClient } from '@/shared/lib/queryClient'
beforeEach(() => mockFetch.mockReset())
it('uses the products REST path and forwards cancellation', async () => {
  const controller = new AbortController()
  mockFetch.mockResolvedValue(jsonResponse(product))
  await fetchProduct('phone one', controller.signal)
  expect(mockFetch).toHaveBeenCalledWith('/api/products/phone%20one', {
    signal: controller.signal,
  })
})
it('exposes HTTP status and a JSON API error', async () => {
  mockFetch.mockResolvedValue(jsonResponse({ error: 'Product not found' }, 404))
  await expect(fetchProduct('missing')).rejects.toMatchObject({
    status: 404,
    message: 'Product not found',
  })
})
it('handles non-JSON errors from a reverse proxy', async () => {
  mockFetch.mockResolvedValue({
    ok: false,
    status: 502,
    json: async () => {
      throw new SyntaxError()
    },
  } as unknown as Response)
  await expect(fetchProducts()).rejects.toMatchObject({
    status: 502,
    message: 'Request failed (502)',
  })
})
it('does not retry client errors, but retries transient failures twice', () => {
  const retry = createQueryClient().getDefaultOptions().queries?.retry
  expect(typeof retry).toBe('function')
  if (typeof retry !== 'function') throw new Error('Expected retry function')
  expect(retry(0, new ApiError(404, 'Missing'))).toBe(false)
  expect(retry(1, new ApiError(503, 'Unavailable'))).toBe(true)
  expect(retry(2, new Error('Offline'))).toBe(false)
})

const product = {
  id: 'phone one',
  name: 'Phone',
  description: '',
  category: 'phones',
  price: 0,
  image: '',
  images: [],
}
const request = {
  filters: { text: '', category: [], price: null },
  sort: 'price-lowest' as const,
  page: 1,
  pageSize: 6,
}
const catalog = {
  items: [product],
  total: 1,
  page: 1,
  pageSize: 6,
  min_price: 0,
  max_price: 0,
}
it.each([
  null,
  { id: 'phone one' },
  { ...product, price: -1 },
  { ...product, price: '125' },
  { ...product, price: Infinity },
  { ...product, price: NaN },
  { ...product, id: '' },
  { ...product, id: '   ' },
  { ...product, id: 'x'.repeat(201) },
  { ...product, images: [null] },
])('rejects invalid API products: %j', async value => {
  mockFetch.mockResolvedValue(jsonResponse(value))
  await expect(fetchProduct('phone one')).rejects.toMatchObject({
    message: 'Invalid API response',
  })
  mockFetch.mockResolvedValue(jsonResponse([value]))
  await expect(fetchProducts()).rejects.toMatchObject({
    message: 'Invalid API response',
  })
})
it.each([
  null,
  { ...catalog, items: [{ ...product, price: -1 }] },
  { ...catalog, total: -1 },
  { ...catalog, total: 1.5 },
  { ...catalog, page: 0 },
  { ...catalog, pageSize: 101 },
  { ...catalog, min_price: -1 },
  { ...catalog, max_price: '100' },
  { ...catalog, min_price: 10, max_price: 0 },
])('rejects invalid catalog responses: %j', async value => {
  mockFetch.mockResolvedValue(jsonResponse(value))
  await expect(fetchCatalog(request)).rejects.toMatchObject({
    message: 'Invalid API response',
  })
})
it('reports malformed successful JSON without exposing its contents', async () => {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError('private upstream body')
    },
  } as unknown as Response)
  await expect(fetchProducts()).rejects.toMatchObject({
    status: 200,
    message: 'Invalid API response',
  })
})

it.each([0, 125.5])(
  'accepts price %s through API, catalog and persisted cart',
  async price => {
    const expected = { ...product, price }
    mockFetch.mockResolvedValue(jsonResponse(expected))
    const fetched = await fetchProduct(expected.id)
    const { loadCartFromStorage } = await import('@/shared/lib/cartStorage')
    const { CART_STORAGE_KEY, CART_STORAGE_VERSION } =
      await import('@/shared/constants/localStorage')
    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({
          version: CART_STORAGE_VERSION,
          items: [{ product: fetched, quantity: 1 }],
        })
      )
      expect(loadCartFromStorage()).toEqual([
        { product: expected, quantity: 1 },
      ])
    } finally {
      localStorage.removeItem(CART_STORAGE_KEY)
    }
    mockFetch.mockResolvedValue(
      jsonResponse({
        ...catalog,
        items: [expected],
        min_price: price,
        max_price: price,
      })
    )
    await expect(fetchCatalog(request)).resolves.toMatchObject({
      items: [expected],
    })
  }
)
it('accepts an empty catalog', async () => {
  const empty = { ...catalog, items: [], total: 0 }
  mockFetch.mockResolvedValue(jsonResponse(empty))
  await expect(fetchCatalog(request)).resolves.toEqual(empty)
})
it('preserves cancellation while reading the response body', async () => {
  const abort = new DOMException('Aborted', 'AbortError')
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => {
      throw abort
    },
  } as unknown as Response)
  await expect(fetchProducts()).rejects.toBe(abort)
})
