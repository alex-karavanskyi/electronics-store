import { StrictMode } from 'react'
import { configureStore } from '@reduxjs/toolkit'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import cartReducer, {
  addToCart,
  hydrateCart,
  incrementQuantity,
  removeFromCart,
} from '@/redux/features/cartSlice'
import favoriteReducer, {
  addFavorite,
  removeFavorite,
  reorderFavorite,
} from '@/redux/features/favoriteSlice'
import { persistCartMiddleware } from '@/redux/middleware/persistCartMiddleware'
import CartHydrator from '@/shared/lib/CartHydrator'
import ProductImagesSync from '@/shared/lib/ProductImagesSync'
import { createQueryClient } from '@/shared/lib/queryClient'
import { productKeys } from '@/shared/hooks/useProducts'
import { mockFetch, jsonResponse } from '../support/fetch'

const old = {
  id: 'outside / catalog',
  name: 'Old',
  price: 12.5,
  description: 'Original',
  category: 'Old',
  image: 'old',
  images: ['old'],
}
const fresh = {
  ...old,
  name: 'New',
  price: 99,
  description: 'New',
  category: 'New',
  image: 'new',
  images: ['new', 'second'],
}
const clients: ReturnType<typeof createQueryClient>[] = []
function setup() {
  const store = configureStore({
    reducer: { cart: cartReducer, favorite: favoriteReducer },
    middleware: get => get().concat(persistCartMiddleware),
  })
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, staleTime: 60_000 } })
  clients.push(client)
  const mount = () =>
    render(
      <StrictMode>
        <Provider store={store}>
          <QueryClientProvider client={client}>
            <CartHydrator />
            <ProductImagesSync />
          </QueryClientProvider>
        </Provider>
      </StrictMode>
    )
  return { store, client, mount }
}
beforeEach(() => {
  localStorage.clear()
  mockFetch.mockReset()
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach(client => client.clear())
  jest.restoreAllMocks()
})

it('refreshes a v1 cart through detail API and persists only images while preserving a live quantity edit', async () => {
  localStorage.setItem(
    'volt_cart',
    JSON.stringify({ version: 1, items: [{ product: old, quantity: 3 }] })
  )
  let resolve!: (value: Response) => void
  mockFetch.mockImplementation(
    () =>
      new Promise(done => {
        resolve = done
      })
  )
  const { store, mount } = setup()
  mount()
  await waitFor(() => expect(mockFetch).toHaveBeenCalled())
  expect(mockFetch.mock.calls[0][0]).toBe(
    '/api/products/outside%20%2F%20catalog'
  )
  act(() => store.dispatch(incrementQuantity(old.id)))
  await act(async () => resolve(jsonResponse(fresh)))
  const expected = [
    {
      product: { ...old, image: 'new', images: ['new', 'second'] },
      quantity: 4,
    },
  ]
  await waitFor(() => expect(store.getState().cart.items).toEqual(expected))
  expect(JSON.parse(localStorage.getItem('volt_cart')!)).toEqual({
    version: 1,
    items: expected,
  })
  act(() => store.dispatch(hydrateCart([{ product: old, quantity: 1 }])))
  expect(store.getState().cart.items).toEqual(expected)
})

it('shares detail data, preserves reordered favorites and does not restore a removed cart item', async () => {
  let resolve!: (value: Response) => void
  mockFetch.mockImplementation(
    () =>
      new Promise(done => {
        resolve = done
      })
  )
  const { store, client, mount } = setup()
  client.setQueryData(productKeys.detail('two'), { ...old, id: 'two' })
  store.dispatch(hydrateCart([{ product: old, quantity: 2 }]))
  store.dispatch(addFavorite(old))
  store.dispatch(addFavorite({ ...old, id: 'two' }))
  mount()
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  expect(mockFetch.mock.calls[0][1]?.signal?.aborted).toBe(true)
  expect(mockFetch.mock.calls[1][1]?.signal?.aborted).toBe(false)
  act(() => {
    store.dispatch(removeFromCart(old.id))
    store.dispatch(reorderFavorite({ from: 0, to: 1 }))
  })
  await act(async () => resolve(jsonResponse(fresh)))
  await waitFor(() =>
    expect(store.getState().favorite.favorites_products).toEqual([
      { ...old, id: 'two' },
      { ...old, image: 'new', images: ['new', 'second'] },
    ])
  )
  expect(store.getState().cart.items).toEqual([])
  act(() => store.dispatch(addToCart(old)))
  await waitFor(() =>
    expect(store.getState().cart.items[0].product.image).toBe('new')
  )
  expect(mockFetch).toHaveBeenCalledTimes(2)
})

it.each([404, 503, 'offline', 'invalid', 'wrong-id'] as const)(
  'keeps snapshots on %s responses',
  async failure => {
    if (failure === 'offline') mockFetch.mockRejectedValue(new Error('offline'))
    else
      mockFetch.mockResolvedValue(
        jsonResponse(
          failure === 'invalid'
            ? {}
            : failure === 'wrong-id'
              ? { ...fresh, id: 'another' }
              : { error: 'Unavailable' },
          typeof failure === 'number' ? failure : 200
        )
      )
    const { store, client, mount } = setup()
    store.dispatch(hydrateCart([{ product: old, quantity: 2 }]))
    store.dispatch(addFavorite(old))
    mount()
    await waitFor(() =>
      expect(
        client.getQueryState(productKeys.detail(old.id))?.fetchStatus
      ).toBe('idle')
    )
    expect(store.getState().cart.items).toEqual([{ product: old, quantity: 2 }])
    expect(store.getState().favorite.favorites_products).toEqual([old])
  }
)

it('keeps removed favorites absent when a shared request finishes', async () => {
  let resolve!: (value: Response) => void
  mockFetch.mockImplementation(
    () =>
      new Promise(done => {
        resolve = done
      })
  )
  const { store, mount } = setup()
  store.dispatch(hydrateCart([{ product: old, quantity: 2 }]))
  store.dispatch(addFavorite(old))
  mount()
  await waitFor(() => expect(mockFetch).toHaveBeenCalled())
  act(() => store.dispatch(removeFavorite(old.id)))
  await act(async () => resolve(jsonResponse(fresh)))
  await waitFor(() =>
    expect(store.getState().cart.items[0].product.image).toBe('new')
  )
  expect(store.getState().favorite.favorites_products).toEqual([])
})

it('updates empty galleries in memory when localStorage fails', async () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('full')
  })
  mockFetch.mockResolvedValue(jsonResponse({ ...fresh, image: '', images: [] }))
  const { store, mount } = setup()
  mount()
  act(() => {
    store.dispatch(addToCart(old))
    store.dispatch(addFavorite(old))
  })
  await waitFor(() =>
    expect(store.getState().cart.items[0].product.images).toEqual([])
  )
  expect(store.getState().cart.items[0]).toEqual({
    product: { ...old, image: '', images: [] },
    quantity: 1,
  })
  expect(store.getState().favorite.favorites_products).toEqual([
    { ...old, image: '', images: [] },
  ])
})
