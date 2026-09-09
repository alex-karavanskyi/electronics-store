import { configureStore } from '@reduxjs/toolkit'
import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import axios from 'axios'
import { Provider } from 'react-redux'

import filterReducer, {
  clearFilters,
  updateFilters,
  updateSort,
} from '@/redux/features/filterSlice'
import { useCatalog } from '@/shared/hooks/useCatalog'
import { productKeys } from '@/shared/hooks/useProducts'
import { createQueryClient } from '@/shared/lib/queryClient'
import { Product } from '@/shared/types/productsType'

const products: Product[] = [
  {
    id: '1',
    name: 'Phone',
    category: 'phones',
    price: 100,
    image: '',
    images: [],
    description: '',
  },
  {
    id: '2',
    name: 'Laptop',
    category: 'laptops',
    price: 200,
    image: '',
    images: [],
    description: '',
  },
  {
    id: '3',
    name: 'Phone case',
    category: 'phones',
    price: 0,
    image: '',
    images: [],
    description: '',
  },
]

it('derives catalog data without mutating cache or resetting choices on refresh', async () => {
  const client = createQueryClient()
  client.setQueryData(productKeys.list(), products)
  const store = configureStore({ reducer: { filter: filterReducer } })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <Provider store={store}>{children}</Provider>
    </QueryClientProvider>
  )
  const { result, unmount } = renderHook(() => useCatalog(), { wrapper })
  expect(result.current.products.map(p => p.id)).toEqual(['3', '1', '2'])
  expect(result.current.filters.max_price).toBe(200)
  act(() => {
    store.dispatch(updateFilters({ name: 'text', value: 'PHO' }))
    store.dispatch(updateFilters({ name: 'category', value: ['phones'] }))
    store.dispatch(updateFilters({ name: 'price', value: 100 }))
    store.dispatch(updateSort('price-highest'))
  })
  expect(result.current.products.map(p => p.id)).toEqual(['1', '3'])
  act(() => {
    client.setQueryData(productKeys.list(), [
      ...products,
      { ...products[0], id: '4', price: 300 },
    ])
  })
  await waitFor(() => expect(result.current.filters.max_price).toBe(300))
  expect(result.current.filters.price).toBe(100)
  expect(result.current.products.map(p => p.id)).toEqual(['1', '3'])
  expect(
    client.getQueryData<Product[]>(productKeys.list())?.map(p => p.id)
  ).toEqual(['1', '2', '3', '4'])
  act(() => {
    store.dispatch(updateFilters({ name: 'price', value: 0 }))
  })
  expect(result.current.products.map(p => p.id)).toEqual(['3'])
  act(() => {
    store.dispatch(clearFilters())
  })
  expect(result.current.filters.price).toBe(300)
  act(() => {
    client.setQueryData(productKeys.list(), [])
  })
  await waitFor(() => expect(result.current.products).toEqual([]))
  expect(result.current.filters).toMatchObject({
    price: 0,
    min_price: 0,
    max_price: 0,
  })
  unmount()
  client.clear()
})

jest.mock('axios')

it('keeps cached no-results usable after a background request fails', async () => {
  jest.mocked(axios.get).mockRejectedValue(new Error('offline'))
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, staleTime: 60_000 } })
  client.setQueryData(productKeys.list(), products)
  const store = configureStore({ reducer: { filter: filterReducer } })
  store.dispatch(updateFilters({ name: 'text', value: 'missing' }))
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <Provider store={store}>{children}</Provider>
    </QueryClientProvider>
  )
  const { result, unmount } = renderHook(() => useCatalog(), { wrapper })
  await act(async () => {
    await result.current.refetch()
  })
  expect(result.current.products).toEqual([])
  expect(result.current.isLoadingError).toBe(false)
  act(() => {
    store.dispatch(clearFilters())
  })
  expect(result.current.products).toHaveLength(3)
  unmount()
  client.clear()
})
