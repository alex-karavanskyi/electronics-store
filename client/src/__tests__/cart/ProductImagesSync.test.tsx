import { StrictMode } from 'react'
import { configureStore } from '@reduxjs/toolkit'
import {
  QueryClientProvider,
  focusManager,
  onlineManager,
} from '@tanstack/react-query'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import cartReducer, {
  addToCart,
  hydrateCart,
  incrementQuantity,
  removeFromCart,
} from '@/redux/features/cartSlice'
import {
  useFavorites,
  guestFavoritesKey,
} from '@/components/favorites/useFavorites'
import Favorites from '@/components/favorites/Favorites'
import { MemoryRouter } from 'react-router-dom'
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
    reducer: { cart: cartReducer },
    middleware: get => get().concat(persistCartMiddleware),
  })
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, staleTime: 60_000 } })
  clients.push(client)
  let actions!: ReturnType<typeof useFavorites>
  function FavoriteProbe() {
    actions = useFavorites()
    return (
      <MemoryRouter>
        <Favorites />
      </MemoryRouter>
    )
  }
  const seed = (ids: string[]) => {
    let storageAvailable = true
    try {
      localStorage.setItem(
        'volt_favorites',
        JSON.stringify({ version: 1, ids })
      )
    } catch {
      storageAvailable = false
    }
    client.setQueryData(guestFavoritesKey, { ids, storageAvailable })
  }
  const mount = () =>
    render(
      <StrictMode>
        <Provider store={store}>
          <QueryClientProvider client={client}>
            <CartHydrator />
            <ProductImagesSync />
            <FavoriteProbe />
          </QueryClientProvider>
        </Provider>
      </StrictMode>
    )
  return { store, client, mount, seed, favorites: () => actions }
}
beforeEach(() => {
  localStorage.clear()
  mockFetch.mockReset()
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach(client => client.clear())
  jest.restoreAllMocks()
  focusManager.setFocused(undefined)
  onlineManager.setOnline(true)
})

it('refreshes every product field in a v1 cart while preserving a live quantity edit', async () => {
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
      product: fresh,
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
  const { store, client, mount, seed, favorites } = setup()
  client.setQueryData(productKeys.detail('two'), { ...old, id: 'two' })
  store.dispatch(hydrateCart([{ product: old, quantity: 2 }]))
  seed([old.id, 'two'])
  mount()
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  expect(mockFetch.mock.calls[0][1]?.signal?.aborted).toBe(true)
  expect(mockFetch.mock.calls[1][1]?.signal?.aborted).toBe(false)
  act(() => {
    store.dispatch(removeFromCart(old.id))
    favorites().setFavoriteOrder(['two', old.id])
  })
  await act(async () => resolve(jsonResponse(fresh)))
  await waitFor(() => expect(favorites().favoriteIds).toEqual(['two', old.id]))
  expect(store.getState().cart.items).toEqual([])
  mockFetch.mockResolvedValue(jsonResponse(fresh))
  act(() => store.dispatch(addToCart(old)))
  await waitFor(() =>
    expect(store.getState().cart.items[0].product.image).toBe('new')
  )
  expect(store.getState().cart.items[0].product).toEqual(fresh)
})

it.each([503, 'offline', 'invalid', 'wrong-id'] as const)(
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
    const { store, client, mount, seed, favorites } = setup()
    store.dispatch(hydrateCart([{ product: old, quantity: 2 }]))
    seed([old.id])
    mount()
    await waitFor(() =>
      expect(
        client.getQueryState(productKeys.detail(old.id))?.fetchStatus
      ).toBe('idle')
    )
    expect(store.getState().cart.items).toEqual([{ product: old, quantity: 2 }])
    expect(favorites().favoriteIds).toEqual([old.id])
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
  const { store, mount, seed, favorites } = setup()
  store.dispatch(hydrateCart([{ product: old, quantity: 2 }]))
  seed([old.id])
  mount()
  await waitFor(() => expect(mockFetch).toHaveBeenCalled())
  act(() => favorites().removeFavorite(old.id))
  await act(async () => resolve(jsonResponse(fresh)))
  await waitFor(() =>
    expect(store.getState().cart.items[0].product.image).toBe('new')
  )
  expect(favorites().favoriteIds).toEqual([])
})

it('updates empty galleries in memory when localStorage fails', async () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('full')
  })
  mockFetch.mockResolvedValue(jsonResponse({ ...fresh, image: '', images: [] }))
  const { store, client, mount, seed } = setup()
  mount()
  act(() => {
    store.dispatch(addToCart(old))
    seed([old.id])
  })
  await waitFor(() =>
    expect(store.getState().cart.items[0].product.images).toEqual([])
  )
  expect(store.getState().cart.items[0]).toEqual({
    product: { ...fresh, image: '', images: [] },
    quantity: 1,
  })
  expect(client.getQueryData(productKeys.detail(old.id))).toEqual({
    ...fresh,
    image: '',
    images: [],
  })
})

it('removes a product after a confirmed 404 even when the query retains cached data', async () => {
  const { store, client, mount } = setup()
  store.dispatch(hydrateCart([{ product: old, quantity: 2 }]))
  client.setQueryData(productKeys.detail(old.id), old)
  mockFetch.mockResolvedValue(jsonResponse({ error: 'Product not found' }, 404))
  mount()
  await waitFor(() => expect(store.getState().cart.items).toEqual([]))
  expect(JSON.parse(localStorage.getItem('volt_cart')!).items).toEqual([])
})

it.each(['focus', 'reconnect'] as const)(
  'refreshes a recently cached cart on %s and preserves snapshots during an outage',
  async event => {
    const { store, client, mount } = setup()
    store.dispatch(hydrateCart([{ product: old, quantity: 2 }]))
    mockFetch.mockResolvedValue(jsonResponse(old))
    mount()
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    const resume = () =>
      act(() => {
        if (event === 'focus') {
          focusManager.setFocused(false)
          focusManager.setFocused(true)
        } else {
          onlineManager.setOnline(false)
          onlineManager.setOnline(true)
        }
      })
    mockFetch.mockResolvedValue(jsonResponse(fresh))
    resume()
    await waitFor(() =>
      expect(store.getState().cart.items).toEqual([
        { product: fresh, quantity: 2 },
      ])
    )
    mockFetch.mockResolvedValue(jsonResponse({ error: 'Unavailable' }, 503))
    resume()
    await waitFor(() =>
      expect(client.getQueryState(productKeys.detail(old.id))?.status).toBe(
        'error'
      )
    )
    await waitFor(() =>
      expect(store.getState().cart.items[0].product).toEqual(fresh)
    )
  }
)
