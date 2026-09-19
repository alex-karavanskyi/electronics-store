import { MemoryRouter, useSearchParams } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { mockFetch, jsonResponse } from '../support/fetch'
import catalogView from '@/redux/features/catalogViewSlice'
import { useCatalog } from '@/shared/hooks/useCatalog'
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
    <MemoryRouter initialEntries={[url]}>
      <Provider store={store}>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </Provider>
    </MemoryRouter>
  )
  return {
    client,
    ...renderHook(
      () => ({
        first: useCatalog(),
        second: useCatalog(),
        set: useSearchParams()[1],
      }),
      { wrapper }
    ),
  }
}
beforeEach(() => {
  mockFetch.mockReset()
  mockFetch.mockResolvedValue(jsonResponse(response))
})
it('shares the exact parameterized request and cache key across catalog consumers', async () => {
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
  expect(mockFetch).toHaveBeenCalledTimes(2)
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
