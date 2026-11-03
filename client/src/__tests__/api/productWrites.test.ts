import {
  createProduct,
  updateProduct,
  deleteProduct,
  fetchMyProducts,
} from '@/shared/api/products'
import { mockFetch, jsonResponse } from '../support/fetch'

const product = {
  id: 'phone / one',
  name: 'Phone',
  price: 0,
  description: '',
  category: '',
  image: '',
  images: [],
}
beforeEach(() => mockFetch.mockReset())

it('loads the personal list with a bearer token and forwards cancellation', async () => {
  const controller = new AbortController()
  mockFetch.mockResolvedValue(jsonResponse([product]))
  await expect(
    fetchMyProducts(async () => 'user-A', controller.signal)
  ).resolves.toEqual([product])
  expect(mockFetch).toHaveBeenCalledWith(
    '/api/me/products',
    expect.objectContaining({
      signal: controller.signal,
      headers: { Authorization: 'Bearer user-A' },
    })
  )
  mockFetch.mockResolvedValue(jsonResponse({ items: [product] }))
  await expect(fetchMyProducts(async () => 'user-A')).rejects.toMatchObject({
    message: 'Invalid API response',
  })
})

it('creates and patches using a fresh bearer token and only the supplied fields', async () => {
  mockFetch.mockResolvedValue(jsonResponse(product))
  const token = jest
    .fn()
    .mockResolvedValueOnce('first')
    .mockResolvedValueOnce('second')
  await expect(
    createProduct(
      { name: 'Phone', price: 0, description: '', category: '', images: [] },
      token
    )
  ).resolves.toEqual(product)
  await expect(updateProduct(product.id, { price: 0 }, token)).resolves.toEqual(
    product
  )
  expect(mockFetch.mock.calls[0]).toEqual([
    '/api/products',
    expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer first',
      },
    }),
  ])
  expect(mockFetch.mock.calls[1]).toEqual([
    '/api/products/phone%20%2F%20one',
    expect.objectContaining({
      method: 'PATCH',
      body: '{"price":0}',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer second',
      },
    }),
  ])
})

it('accepts empty DELETE success without parsing JSON, but still reports JSON errors', async () => {
  const json = jest.fn().mockRejectedValue(new SyntaxError())
  mockFetch.mockResolvedValue({
    ok: true,
    status: 204,
    json,
  } as unknown as Response)
  await expect(
    deleteProduct(product.id, async () => 'token')
  ).resolves.toBeUndefined()
  expect(json).not.toHaveBeenCalled()
  mockFetch.mockResolvedValue(
    jsonResponse({ error: 'Administrator access required' }, 403)
  )
  await expect(
    deleteProduct(product.id, async () => 'token')
  ).rejects.toMatchObject({ status: 403 })
})

it('never sends a write without a token and rejects a malformed mutation response', async () => {
  await expect(
    updateProduct('one', { price: 2 }, async () => null)
  ).rejects.toMatchObject({ status: 401 })
  expect(mockFetch).not.toHaveBeenCalled()
  mockFetch.mockResolvedValue(jsonResponse({ id: 'one' }))
  await expect(
    updateProduct('one', { price: 2 }, async () => 'token')
  ).rejects.toMatchObject({ message: 'Invalid API response' })
})
