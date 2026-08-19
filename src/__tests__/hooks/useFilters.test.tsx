import { configureStore } from '@reduxjs/toolkit'
import { act, renderHook } from '@testing-library/react'
import { Provider } from 'react-redux'

import filterReducer, { updateFilters } from '@/redux/features/filterSlice'
import paginationReducer from '@/redux/features/paginationSlice'
import { useDebouncedUpdateFilters } from '@/shared/hooks/useDebounceFilters'
import { useFilters } from '@/shared/hooks/useFilters'
import { FilterName } from '@/shared/types/productsType'

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => ({
    toString: () => 'sort=price-lowest',
  })),
}))

jest.mock('@/shared/hooks/useDebounceFilters')

const mockDebouncedUpdate = jest.fn()
const mockedUseDebouncedUpdateFilters = jest.mocked(useDebouncedUpdateFilters)

const createWrapper = () => {
  const store = configureStore({
    reducer: {
      filter: filterReducer,
      pagination: paginationReducer,
    },
  })

  return {
    store,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    ),
  }
}

describe('useFilters', () => {
  beforeEach(() => {
    mockDebouncedUpdate.mockClear()
    mockedUseDebouncedUpdateFilters.mockReturnValue(
      mockDebouncedUpdate as never
    )
  })

  it('updates a text search and preserves existing URL parameters', () => {
    const { store, wrapper } = createWrapper()
    const { result } = renderHook(() => useFilters(), { wrapper })

    act(() => result.current.handleFilters(FilterName.Text, 'phone'))

    expect(store.getState().filter.filters.text).toBe('phone')
    expect(store.getState().pagination.pagination).toBe(1)
    expect(mockDebouncedUpdate).toHaveBeenCalledTimes(1)
    expect(mockDebouncedUpdate.mock.calls[0][0].toString()).toBe(
      'sort=price-lowest&text=phone'
    )
  })

  it('keeps selected categories when adding another one', () => {
    const { store, wrapper } = createWrapper()
    store.dispatch(updateFilters({ name: 'category', value: ['laptops'] }))
    const { result } = renderHook(() => useFilters(), { wrapper })

    act(() => result.current.handleFilters(FilterName.Category, 'phones'))

    expect(store.getState().filter.filters.category).toEqual([
      'laptops',
      'phones',
    ])
    expect(mockDebouncedUpdate.mock.calls[0][0].getAll('category')).toEqual([
      'laptops',
      'phones',
    ])
  })

  it('clears filters and resets pagination', () => {
    const { store, wrapper } = createWrapper()
    store.dispatch(updateFilters({ name: 'text', value: 'phone' }))
    store.dispatch(updateFilters({ name: 'category', value: ['phones'] }))
    const { result } = renderHook(() => useFilters(), { wrapper })

    act(() => result.current.handleClearButton())

    expect(store.getState().filter.filters.text).toBe('')
    expect(store.getState().filter.filters.category).toEqual([])
    expect(store.getState().pagination.pagination).toBe(1)
    expect(mockDebouncedUpdate.mock.calls[0][0].toString()).toBe('')
  })
})
