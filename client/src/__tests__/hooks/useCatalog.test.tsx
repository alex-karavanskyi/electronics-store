import { CatalogRouter } from '../support/CatalogRouter'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { mockFetch, jsonResponse } from '../support/fetch'
import catalogView from '@/redux/features/catalogViewSlice'
import { setListView, setGridView } from '@/redux/features/catalogViewSlice'
import { useCatalog } from '@/components/home/hooks/useCatalog'
import { productKeys } from '@/shared/hooks/useProducts'
import { parseFilters } from '@/shared/filters/productFilters'
import { createQueryClient } from '@/shared/lib/queryClient'
const response = {
  items: [
    {
      id: 'one',
      name: 'Phone',
      price: 100,
      image: '',
      images: [],
      category: 'phones',
      description: '',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 6,
  min_price: 0,
  max_price: 300,
}
function setup(url = '/?text=Phone&price=100') {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, staleTime: 60000 } })
  const store = configureStore({ reducer: { catalogView } })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CatalogRouter initialEntries={[url]}>
      <Provider store={store}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </Provider>
    </CatalogRouter>
  )
  return {
    client,
    store,
    ...renderHook(
      () => ({
        first: useCatalog(),
        second: useCatalog(),
        set: useSearchParams()[1],
        navigate: useNavigate(),
        location: useLocation(),
      }),
      { wrapper }
    ),
  }
}
beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockResolvedValue(jsonResponse(response))
})

it('loads results beyond 100 in list mode and preserves URL history and view switches', async () => {
  mockFetch.mockImplementation(async input => {
    const params = new URL(String(input), 'http://localhost').searchParams
    const page = Number(params.get('page') ?? 1)
    const pageSize = Number(params.get('pageSize'))
    return jsonResponse({
      ...response,
      items: [
        { ...response.items[0], id: page === 2 ? 'product-101' : 'product-1' },
      ],
      page,
      pageSize,
      total: 101,
    })
  })
  const { client, store, result, unmount } = setup(
    '/?page=2&campaign=sale#collection'
  )
  act(() => {
    store.dispatch(setListView())
  })
  await waitFor(() => expect(result.current.first.pageSize).toBe(100))
  await waitFor(() =>
    expect(result.current.first.products[0]?.id).toBe('product-101')
  )
  expect(
    mockFetch.mock.calls.some(([url]) =>
      String(url).includes('page=2&pageSize=100')
    )
  ).toBe(true)
  act(() => result.current.set({ page: '1', campaign: 'sale' }))
  await waitFor(() =>
    expect(result.current.first.products[0]?.id).toBe('product-1')
  )
  act(() => result.current.navigate(-1))
  await waitFor(() =>
    expect(result.current.first.products[0]?.id).toBe('product-101')
  )
  expect(result.current.location.hash).toBe('#collection')
  act(() => {
    store.dispatch(setGridView())
  })
  await waitFor(() => expect(result.current.first.pageSize).toBe(6))
  expect(result.current.location.search).toContain('page=2')
  act(() => result.current.navigate(1))
  await waitFor(() =>
    expect(result.current.first.products[0]?.id).toBe('product-1')
  )
  unmount()
  client.clear()
})

it('replaces an out-of-range list page with the returned page without losing URL context', async () => {
  mockFetch.mockResolvedValue(jsonResponse({ ...response, pageSize: 100 }))
  const { client, store, result, unmount } = setup(
    '/?page=99&campaign=sale#collection'
  )
  act(() => {
    store.dispatch(setListView())
  })
  await waitFor(() => expect(result.current.first.isPending).toBe(false))
  await waitFor(() =>
    expect(result.current.location.search).toBe('?campaign=sale')
  )
  expect(result.current.location.hash).toBe('#collection')
  unmount()
  client.clear()
})
it('shares the exact parameterized request and cache key across catalog consumers', async () => {
  // Keep the requested page valid: page correction has its own test above.
  mockFetch.mockImplementation(async input => {
    const page = Number(
      new URL(String(input), 'http://localhost').searchParams.get('page') ?? 1
    )
    return jsonResponse({ ...response, page, total: page === 2 ? 12 : 1 })
  })
  const { client, result, unmount } = setup()
  await waitFor(() => expect(result.current.first.products).toHaveLength(1))
  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockFetch.mock.calls[0][0]).toBe(
    '/api/products/catalog?text=Phone&price=100&pageSize=6'
  )
  const key = productKeys.catalog({
    ...parseFilters(new URLSearchParams('text=Phone&price=100')),
    pageSize: 6,
  })
  expect(client.getQueryData(key)).toEqual(response)
  act(() =>
    result.current.set({ text: 'Phone', price: '100', campaign: 'sale' })
  )
  expect(mockFetch).toHaveBeenCalledTimes(1)
  act(() => result.current.set({ text: 'Laptop', page: '2' }))
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  expect(mockFetch.mock.calls[1][0]).toBe(
    '/api/products/catalog?text=Laptop&page=2&pageSize=6'
  )
  act(() => result.current.set({ text: 'Phone', price: '100' }))
  expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([
    '/api/products/catalog?text=Phone&price=100&pageSize=6',
    '/api/products/catalog?text=Laptop&page=2&pageSize=6',
  ])
  unmount()
  client.clear()
})
it('retains cached data on background failure and cancels abandoned requests', async () => {
  const { client, result, unmount } = setup()
  await waitFor(() => expect(result.current.first.products).toHaveLength(1))
  mockFetch.mockRejectedValueOnce(new Error('offline'))
  await act(async () => {
    await result.current.first.refetch()
  })
  expect(result.current.first.products).toHaveLength(1)
  expect(result.current.first.isLoadingError).toBe(false)
  mockFetch.mockImplementation(() => new Promise(() => {}))
  act(() => result.current.set({ text: 'new' }))
  expect(result.current.first.isPending).toBe(true)
  expect(result.current.first.products).toEqual([])
  expect(result.current.first.filters.max_price).toBe(300)
  const signal =
    mockFetch.mock.calls[mockFetch.mock.calls.length - 1]?.[1]?.signal
  unmount()
  expect(signal?.aborted).toBe(true)
  client.clear()
})
