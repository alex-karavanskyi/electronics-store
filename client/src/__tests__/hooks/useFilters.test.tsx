import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { useFilters } from '@/components/home/hooks/useFilters'
import { FilterName } from '@/components/home/filters/filterTypes'
it('adapts existing controls to URL changes without Redux', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={['/?category=laptops&page=3&campaign=sale']}>
      {children}
    </MemoryRouter>
  )
  const { result } = renderHook(
    () => ({ ...useFilters(), location: useLocation() }),
    { wrapper }
  )
  act(() => result.current.handleFilters(FilterName.Category, 'phones'))
  expect(
    new URLSearchParams(result.current.location.search).getAll('category')
  ).toEqual(['laptops', 'phones'])
  expect(result.current.location.search).not.toContain('page=')
  act(() => result.current.handleFilters(FilterName.Category, 'laptops'))
  expect(
    new URLSearchParams(result.current.location.search).getAll('category')
  ).toEqual(['phones'])
  act(() => result.current.handleClearButton())
  expect(result.current.location.search).toBe('?campaign=sale')
})
