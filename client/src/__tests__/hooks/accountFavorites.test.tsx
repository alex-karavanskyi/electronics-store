import { randomUUID } from 'node:crypto'
import { useState, type PropsWithChildren } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider, focusManager } from '@tanstack/react-query'
import { createQueryClient } from '@/shared/lib/queryClient'
import {
  AccessContext,
  unavailableAccess,
  type Access,
} from '@/shared/auth/useAccess'
import { useFavorites } from '@/components/favorites/useFavorites'
import FavoritesStorageSync from '@/components/favorites/FavoritesStorageSync'
import { mockFetch, jsonResponse } from '../support/fetch'
import { saveFavoriteIds } from '@/shared/lib/favoritesStorage'
import { installStorageLocks } from '../support/locks'
import { toast } from 'sonner'

Object.defineProperty(crypto, 'randomUUID', {
  value: randomUUID,
  configurable: true,
})
const product = {
  id: 'one',
  name: 'Phone',
  price: 10,
  image: '',
  images: [],
  category: '',
  description: '',
}
const account = (userId: string): Access => ({
  status: 'authenticated',
  userId,
  isAdmin: false,
  getToken: async () => userId,
})
const clients: ReturnType<typeof createQueryClient>[] = []
function setup(
  initial: Access = unavailableAccess,
  existing?: ReturnType<typeof createQueryClient>
) {
  const client = existing ?? createQueryClient()
  client.setDefaultOptions({
    queries: { retry: false },
    mutations: { retry: false },
  })
  clients.push(client)
  let setAccess: (next: Access) => void = () => {
    throw new Error('not mounted')
  }
  const Wrapper = ({ children }: PropsWithChildren) => {
    const [access, set] = useState(initial)
    setAccess = set
    return (
      <AccessContext.Provider value={access}>
        <QueryClientProvider client={client}>
          <FavoritesStorageSync />
          {children}
        </QueryClientProvider>
      </AccessContext.Provider>
    )
  }
  return {
    client,
    switchTo: (next: Access) => act(() => setAccess(next)),
    ...renderHook(() => ({ first: useFavorites(), second: useFavorites() }), {
      wrapper: Wrapper,
    }),
  }
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => {
    resolve = r
  })
  return { promise, resolve }
}
beforeEach(() => {
  localStorage.clear()
  mockFetch.mockReset()
  installStorageLocks()
})
afterEach(() => {
  toast.dismiss()
  cleanup()
  clients.splice(0).forEach(client => client.clear())
  jest.restoreAllMocks()
  focusManager.setFocused(undefined)
})

it('waits for a successful server response before confirming a favorite addition', async () => {
  const response = deferred<Response>()
  mockFetch.mockResolvedValue(jsonResponse({ ids: [], revision: 0 }))
  const app = setup(account('user_a'))
  await waitFor(() => expect(app.result.current.first.canWrite).toBe(true))
  mockFetch.mockImplementation((_url, options) =>
    options?.method === 'PUT'
      ? response.promise
      : Promise.resolve(jsonResponse({ ids: ['one'], revision: 1 }))
  )
  act(() => app.result.current.first.addFavorite(product))
  await waitFor(() =>
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/favorites/items/one'),
      expect.objectContaining({ method: 'PUT' })
    )
  )
  expect(toast.getToasts()).toEqual([])
  await act(async () => {
    response.resolve(jsonResponse({ ids: ['one'], revision: 1 }))
  })
  await waitFor(() =>
    expect(toast.getToasts()).toEqual([
      expect.objectContaining({
        id: 'favorite-one',
        title: 'Product added to favorites',
      }),
    ])
  )
})

it('merges guest IDs once and displays the server result in all consumers without persisting server data', async () => {
  await saveFavoriteIds(['one'])
  const requests: string[] = []
  mockFetch.mockImplementation(async (url, options) => {
    expect(options?.headers).toMatchObject({ Authorization: 'Bearer user_a' })
    requests.push(String(url))
    if (String(url).endsWith('/merge')) {
      expect(JSON.parse(options!.body as string)).toMatchObject({
        ids: ['one'],
        batchId: expect.any(String),
      })
      return jsonResponse({ ids: ['remote', 'one'], revision: 1 })
    }
    return jsonResponse({ ids: ['remote', 'one'], revision: 1 })
  })
  const app = setup(account('user_a'))
  await waitFor(() =>
    expect(app.result.current.second.favoriteIds).toEqual(['remote', 'one'])
  )
  expect(requests.filter(path => path.endsWith('/merge'))).toHaveLength(1)
  expect(localStorage.getItem('volt_favorites')).not.toContain('remote')
  expect(JSON.parse(localStorage.getItem('volt_favorites')!).ids).toEqual([])
  expect(
    JSON.parse(localStorage.getItem('volt_favorites')!).pendingImports
  ).toEqual([])
})

it('holds mutations during auth loading and does not import A pending data into B after reload', async () => {
  await saveFavoriteIds(['one'])
  const merge = deferred<Response>()
  mockFetch.mockImplementation(async (url, options) => {
    if (String(url).endsWith('/merge')) return merge.promise
    expect(options?.headers).toMatchObject({ Authorization: 'Bearer user_b' })
    return jsonResponse({ ids: ['b-only'], revision: 0 })
  })
  const first = setup({ ...unavailableAccess, status: 'loading' })
  act(() =>
    first.result.current.first.addFavorite({ ...product, id: 'blocked' })
  )
  expect(first.result.current.first.favoriteIds).toEqual([])
  expect(mockFetch).not.toHaveBeenCalled()
  first.switchTo(account('user_a'))
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
  first.unmount()
  const second = setup(account('user_b'))
  await waitFor(() =>
    expect(second.result.current.first.favoriteIds).toEqual(['b-only'])
  )
  await act(async () => {
    merge.resolve(jsonResponse({ ids: ['a-private'], revision: 1 }))
    await merge.promise
  })
  expect(second.result.current.first.favoriteIds).toEqual(['b-only'])
  const envelope = JSON.parse(localStorage.getItem('volt_favorites')!)
  expect(envelope.pendingImports).toEqual([
    expect.objectContaining({ userId: 'user_a', ids: ['one'] }),
  ])
  second.switchTo(unavailableAccess)
  await waitFor(() =>
    expect(second.result.current.first.favoriteIds).toEqual([])
  )
})

it('retries the identical merge batch after a network failure', async () => {
  await saveFavoriteIds(['one'])
  const batches: string[] = []
  mockFetch.mockImplementation(async (url, options) => {
    if (String(url).endsWith('/merge')) {
      batches.push(JSON.parse(options!.body as string).batchId)
      if (batches.length === 1) throw new Error('offline')
    }
    return jsonResponse({ ids: ['one'], revision: 1 })
  })
  const app = setup(account('user_a'))
  await waitFor(() => expect(app.result.current.first.error).toBeTruthy())
  await waitFor(() => expect(app.result.current.second.error).toBeTruthy())
  act(() => app.result.current.first.retry())
  await waitFor(() =>
    expect(app.result.current.first.favoriteIds).toEqual(['one'])
  )
  expect(batches).toHaveLength(2)
  expect(batches[1]).toBe(batches[0])
})

it('keeps account removals available when guest import exceeds the limit and preserves the retry batch', async () => {
  await saveFavoriteIds(['one'])
  let full = true
  const batches: string[] = []
  mockFetch.mockImplementation(async (url, options) => {
    if (String(url).endsWith('/merge')) {
      batches.push(JSON.parse(options!.body as string).batchId)
      if (full)
        return jsonResponse(
          { error: 'A wishlist can contain at most 500 products' },
          409
        )
    }
    if (options?.method === 'DELETE') full = false
    return jsonResponse({ ids: full ? ['remote'] : ['one'], revision: 1 })
  })
  const app = setup(account('user_a'))
  await waitFor(() =>
    expect(app.result.current.first.favoriteIds).toEqual(['remote'])
  )
  expect(app.result.current.first.error).toBeTruthy()
  expect(app.result.current.first.canWrite).toBe(true)
  act(() => app.result.current.first.removeFavorite('remote'))
  await waitFor(() =>
    expect(app.result.current.first.favoriteIds).toEqual(['one'])
  )
  await waitFor(() => expect(app.result.current.first.error).toBeFalsy())
  expect(new Set(batches).size).toBe(1)
})

it('can discard an invalid pending guest import without deleting account favorites', async () => {
  await saveFavoriteIds(['demo_invalid'])
  mockFetch.mockImplementation(async url =>
    String(url).endsWith('/merge')
      ? jsonResponse({ error: 'Invalid favorites request' }, 400)
      : jsonResponse({ ids: ['remote'], revision: 0 })
  )
  const app = setup(account('user_a'))
  await waitFor(() =>
    expect(app.result.current.first.favoriteIds).toEqual(['remote'])
  )
  expect(app.result.current.first.hasPendingImport).toBe(true)
  await act(async () => {
    await app.result.current.first.discardImport()
  })
  await waitFor(() => expect(app.result.current.first.error).toBeFalsy())
  expect(app.result.current.first.favoriteIds).toEqual(['remote'])
  expect(
    JSON.parse(localStorage.getItem('volt_favorites')!).pendingImports
  ).toEqual([])
})

it('does not repopulate a disposed account cache when a mutation outlives its component', async () => {
  const write = deferred<Response>()
  mockFetch.mockImplementation(async (_url, options) => {
    if (options?.method === 'PUT') return write.promise
    return jsonResponse({ ids: [], revision: 0 })
  })
  const first = setup(account('user_a'))
  await waitFor(() => expect(first.result.current.first.canWrite).toBe(true))
  act(() => first.result.current.first.addFavorite(product))
  await waitFor(() => expect(first.result.current.first.isSaving).toBe(true))
  first.unmount()
  const second = setup(account('user_b'), first.client)
  await waitFor(() => expect(second.result.current.first.canWrite).toBe(true))
  await act(async () => {
    write.resolve(jsonResponse({ ids: ['a-private'], revision: 1 }))
    await write.promise
  })
  expect(
    first.client
      .getQueryCache()
      .findAll()
      .some(query => query.queryKey.includes('user_a'))
  ).toBe(false)
})

it('ignores a late mutation and clears private cache when switching accounts', async () => {
  const write = deferred<Response>()
  mockFetch.mockImplementation(async (_url, options) => {
    if (options?.method === 'PUT') return write.promise
    const user = (options?.headers as Record<string, string>).Authorization
    return jsonResponse({
      ids: user.endsWith('user_a') ? ['a-only'] : ['b-only'],
      revision: 0,
    })
  })
  const app = setup(account('user_a'))
  await waitFor(() =>
    expect(app.result.current.first.favoriteIds).toEqual(['a-only'])
  )
  act(() => app.result.current.first.addFavorite(product))
  await waitFor(() => expect(app.result.current.second.isSaving).toBe(true))
  app.switchTo(account('user_b'))
  await waitFor(() =>
    expect(app.result.current.first.favoriteIds).toEqual(['b-only'])
  )
  await act(async () => {
    write.resolve(jsonResponse({ ids: ['a-only', 'one'], revision: 1 }))
    await write.promise
  })
  expect(app.result.current.first.favoriteIds).toEqual(['b-only'])
  expect(
    app.client
      .getQueryCache()
      .findAll()
      .some(query => query.queryKey.includes('user_a'))
  ).toBe(false)
  app.switchTo({ ...unavailableAccess, status: 'guest' })
  await waitFor(() => expect(app.result.current.first.favoriteIds).toEqual([]))
})

it('shows a reorder conflict, reloads the server order and refreshes on focus', async () => {
  let ids = ['one', 'two']
  mockFetch.mockImplementation(async (_url, options) => {
    if (options?.method === 'PUT') {
      expect(JSON.parse(options.body as string)).toEqual({
        ids: ['two', 'one'],
        revision: 4,
      })
      ids = ['three', 'one', 'two']
      return jsonResponse(
        { error: 'Favorites changed on another device. Reload and try again.' },
        409
      )
    }
    return jsonResponse({ ids, revision: 4 })
  })
  const app = setup(account('user_a'))
  await waitFor(() =>
    expect(app.result.current.first.favoriteIds).toEqual(['one', 'two'])
  )
  act(() => app.result.current.first.setFavoriteOrder(['two', 'one']))
  await waitFor(() => expect(app.result.current.first.error).toBeTruthy())
  await waitFor(() => expect(app.result.current.second.error).toBeTruthy())
  await waitFor(() =>
    expect(app.result.current.first.favoriteIds).toEqual([
      'three',
      'one',
      'two',
    ])
  )
  ids = ['two']
  act(() => {
    focusManager.setFocused(false)
    focusManager.setFocused(true)
  })
  await waitFor(() =>
    expect(app.result.current.first.favoriteIds).toEqual(['two'])
  )
})
