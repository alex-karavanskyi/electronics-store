import { StrictMode, type PropsWithChildren } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/shared/lib/queryClient'
import { productKeys } from '@/shared/hooks/useProducts'
import { useFavorites } from '@/components/favorites/useFavorites'
import FavoritesStorageSync from '@/components/favorites/FavoritesStorageSync'
import { ApiError } from '@/shared/api/http'
import { toast } from 'sonner'

const product = {
  id: 'one',
  name: 'Phone',
  price: 100,
  description: '',
  category: '',
  image: '',
  images: [],
}
const clients: ReturnType<typeof createQueryClient>[] = []
function setup() {
  const client = createQueryClient()
  clients.push(client)
  const wrapper = ({ children }: PropsWithChildren) => (
    <StrictMode>
      <QueryClientProvider client={client}>
        <FavoritesStorageSync />
        {children}
      </QueryClientProvider>
    </StrictMode>
  )
  return {
    client,
    ...renderHook(() => ({ first: useFavorites(), second: useFavorites() }), {
      wrapper,
    }),
  }
}
const persistedIds = () =>
  JSON.parse(localStorage.getItem('volt_favorites')!).ids
beforeEach(() => localStorage.clear())
afterEach(() => {
  toast.dismiss()
  cleanup()
  clients.splice(0).forEach(client => client.clear())
  jest.restoreAllMocks()
})

it('notifies once for a guest addition, without notifying on duplicate adds or removal', async () => {
  const { result } = setup()
  act(() => result.current.first.toggleFavorite(product))
  await waitFor(() =>
    expect(toast.getToasts()).toEqual([
      expect.objectContaining({
        id: 'favorite-one',
        title: 'Product added to favorites',
      }),
    ])
  )
  toast.dismiss()
  act(() => result.current.first.addFavorite(product))
  expect(toast.getToasts()).toEqual([])
  act(() => result.current.first.toggleFavorite(product))
  expect(toast.getToasts()).toEqual([])
})

it('deduplicates additions from multiple consumers and restores order in a fresh app', async () => {
  const first = setup()
  act(() => {
    first.result.current.first.addFavorite(product)
    first.result.current.second.addFavorite(product)
    first.result.current.first.addFavorite({ ...product, id: 'two' })
    first.result.current.second.setFavoriteOrder(['two', 'one'])
  })
  await waitFor(() =>
    expect(first.result.current.second.favoriteIds).toEqual(['two', 'one'])
  )
  expect(persistedIds()).toEqual(['two', 'one'])
  first.unmount()
  const reloaded = setup()
  expect(reloaded.result.current.first.favoriteIds).toEqual(['two', 'one'])
  act(() => reloaded.result.current.first.removeFavorite('two'))
  expect(persistedIds()).toEqual(['one'])
})

it.each([
  '{',
  'null',
  '{"version":2,"ids":["one"]}',
  '{"version":1,"ids":[42]}',
  '{"version":1,"ids":[" "]}',
])('recovers from invalid storage %s without crashing', value => {
  localStorage.setItem('volt_favorites', value)
  const { result } = setup()
  expect(result.current.first.favoriteIds).toEqual([])
  act(() => result.current.first.addFavorite(product))
  expect(persistedIds()).toEqual(['one'])
})

it('normalizes duplicate stored IDs without changing their identity or order', () => {
  localStorage.setItem(
    'volt_favorites',
    JSON.stringify({ version: 1, ids: ['two', ' outside / catalog ', 'two'] })
  )
  const { result } = setup()
  expect(result.current.first.favoriteIds).toEqual([
    'two',
    ' outside / catalog ',
  ])
})

it('can reorder normalized IDs from legacy storage containing duplicates', () => {
  localStorage.setItem(
    'volt_favorites',
    JSON.stringify({ version: 1, ids: ['two', 'one', 'two'] })
  )
  const { result } = setup()
  act(() => result.current.first.setFavoriteOrder(['one', 'two']))
  expect(persistedIds()).toEqual(['one', 'two'])
})

it('rejects incomplete, duplicate and foreign reorder IDs and invalid additions', () => {
  const { result } = setup()
  act(() => {
    result.current.first.addFavorite(product)
    result.current.first.addFavorite({ ...product, id: 'two' })
    result.current.first.addFavorite({ ...product, id: ' ' })
    result.current.first.setFavoriteOrder(['two'])
    result.current.first.setFavoriteOrder(['two', 'two'])
    result.current.first.setFavoriteOrder(['one', 'other'])
  })
  expect(persistedIds()).toEqual(['one', 'two'])
})

it('keeps edits in memory across unmounts when storage throws and reports the failure', async () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('full')
  })
  const { result, client, unmount } = setup()
  act(() => result.current.first.addFavorite(product))
  await waitFor(() =>
    expect(result.current.second.favoriteIds).toEqual(['one'])
  )
  expect(result.current.first.storageAvailable).toBe(false)
  unmount()
  const next = renderHook(useFavorites, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
  expect(next.result.current.favoriteIds).toEqual(['one'])
  act(() => next.result.current.toggleFavorite(product))
  await waitFor(() => expect(next.result.current.favoriteIds).toEqual([]))
})

it('does not replace fresh detail data with an older catalog card', () => {
  const { client, result } = setup()
  client.setQueryData(productKeys.detail('one'), {
    ...product,
    name: 'Fresh',
    price: 200,
  })
  act(() => result.current.first.addFavorite(product))
  expect(client.getQueryData(productKeys.detail('one'))).toMatchObject({
    name: 'Fresh',
    price: 200,
  })
})

it('preserves a failed detail refresh and its age when adding an older catalog card', async () => {
  const { client, result } = setup()
  const key = productKeys.detail('one')
  client.setQueryData(key, product, { updatedAt: 1 })
  const error = new ApiError(404, 'Product not found')
  await expect(
    client.fetchQuery({
      queryKey: key,
      queryFn: async () => {
        throw error
      },
      retry: false,
    })
  ).rejects.toBe(error)
  act(() => result.current.first.addFavorite(product))
  expect(client.getQueryState(key)).toMatchObject({
    status: 'error',
    error,
    dataUpdatedAt: 1,
  })
})

it('updates other consumers on cross-tab storage changes and clear without echo writes', async () => {
  const { result } = setup()
  const write = jest.spyOn(Storage.prototype, 'setItem')
  act(() =>
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'volt_favorites',
        newValue: '{"version":1,"ids":["two"]}',
        storageArea: localStorage,
      })
    )
  )
  await waitFor(() => expect(result.current.first.favoriteIds).toEqual(['two']))
  expect(write).not.toHaveBeenCalled()
  act(() =>
    window.dispatchEvent(
      new StorageEvent('storage', { key: null, storageArea: localStorage })
    )
  )
  await waitFor(() => expect(result.current.second.favoriteIds).toEqual([]))
})
