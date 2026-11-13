import { act, renderHook, waitFor } from '@testing-library/react'
import { useLocation, useNavigate } from 'react-router-dom'
import { parseFilters, serializeFilters } from '@/shared/filters/productFilters'
import { useProductFilters } from '@/components/home/hooks/useProductFilters'
import { CatalogRouter } from '../support/CatalogRouter'
it('validates input, canonicalizes categories and omits defaults without dropping unrelated values', () => {
  const parsed = parseFilters(
    new URLSearchParams(
      'price=-1&page=bad&sort=bad&category=b&category=a&category=b'
    )
  )
  expect(parsed).toEqual({
    filters: { text: '', category: ['a', 'b'], price: null, minPrice: null },
    sort: 'price-lowest',
    page: 1,
  })
  const params = serializeFilters(
    parsed,
    new URLSearchParams('text=old&page=8&campaign=a&campaign=b')
  )
  expect(params.getAll('campaign')).toEqual(['a', 'b'])
  expect(params.has('page')).toBe(false)
  expect(params.has('price')).toBe(false)
  expect(params.has('text')).toBe(false)
  expect(parseFilters(params)).toEqual(parsed)
})

it('combines updates from separate consumers into one history entry', async () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CatalogRouter
      initialEntries={['/?page=3&campaign=a&campaign=b#collection']}
    >
      {children}
    </CatalogRouter>
  )
  const { result } = renderHook(
    () => ({
      first: useProductFilters(),
      second: useProductFilters(),
      location: useLocation(),
      navigate: useNavigate(),
    }),
    { wrapper }
  )
  await act(async () => {
    result.current.first.updateFilter('minPrice', 10)
    result.current.second.updateFilter('price', 50)
  })
  await waitFor(() => {
    const params = new URLSearchParams(result.current.location.search)
    expect(params.get('minPrice')).toBe('10')
    expect(params.get('price')).toBe('50')
    expect(params.has('page')).toBe(false)
    expect(params.getAll('campaign')).toEqual(['a', 'b'])
  })
  expect(result.current.location.hash).toBe('#collection')
  act(() => result.current.navigate(-1))
  await waitFor(() => expect(result.current.first.page).toBe(3))
  expect(result.current.first.filters.minPrice).toBeNull()
  expect(result.current.second.filters.price).toBeNull()
})
it('updates filters atomically, resets page and restores history', async () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CatalogRouter initialEntries={['/?page=3&campaign=sale']}>
      {children}
    </CatalogRouter>
  )
  const { result } = renderHook(
    () => ({
      ...useProductFilters(),
      location: useLocation(),
      navigate: useNavigate(),
    }),
    { wrapper }
  )
  await act(async () => {
    await Promise.all([
      result.current.updateFilter('text', 'Phone'),
      result.current.updateFilter('price', 0),
    ])
  })
  expect(result.current.filters).toMatchObject({ text: 'Phone', price: 0 })
  expect(result.current.page).toBe(1)
  await act(() => result.current.updatePage(2))
  expect(result.current.page).toBe(2)
  await act(() => result.current.updateSort('name-z'))
  expect(result.current.sorting).toBe('name-z')
  expect(result.current.page).toBe(1)
  act(() => result.current.navigate(-1))
  expect(result.current.page).toBe(2)
  await act(() => result.current.updateFilter('minPrice', 10))
  expect(
    new URLSearchParams(result.current.location.search).get('minPrice')
  ).toBe('10')
  await act(() => result.current.resetFilters())
  expect(result.current.location.search).toBe('?campaign=sale')
})
