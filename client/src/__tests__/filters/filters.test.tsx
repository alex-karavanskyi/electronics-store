import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { parseFilters, serializeFilters } from '@/shared/filters/productFilters'
import { useProductFilters } from '@/shared/hooks/useProductFilters'
it('validates input, canonicalizes categories and omits defaults without dropping unrelated values', () => {
  const parsed = parseFilters(
    new URLSearchParams(
      'price=-1&page=bad&sort=bad&category=b&category=a&category=b'
    )
  )
  expect(parsed).toEqual({
    filters: { text: '', category: ['a', 'b'], price: null },
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
it('updates filters atomically, resets page and restores history', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={['/?page=3&campaign=sale']}>
      {children}
    </MemoryRouter>
  )
  const { result } = renderHook(
    () => ({
      ...useProductFilters(),
      location: useLocation(),
      navigate: useNavigate(),
    }),
    { wrapper }
  )
  act(() => {
    result.current.updateFilter('text', 'Phone')
    result.current.updateFilter('price', 0)
  })
  expect(result.current.filters).toMatchObject({ text: 'Phone', price: 0 })
  expect(result.current.page).toBe(1)
  act(() => result.current.updatePage(2))
  expect(result.current.page).toBe(2)
  act(() => result.current.updateSort('name-z'))
  expect(result.current.sorting).toBe('name-z')
  expect(result.current.page).toBe(1)
  act(() => result.current.navigate(-1))
  expect(result.current.page).toBe(2)
  act(() => result.current.resetFilters())
  expect(result.current.location.search).toBe('?campaign=sale')
})
