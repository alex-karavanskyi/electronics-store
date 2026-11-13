import { CatalogRouter } from '../support/CatalogRouter'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useLocation } from 'react-router-dom'
import { useFilters } from '@/components/home/hooks/useFilters'
import { FilterName } from '@/components/home/filters/filterTypes'
it('adapts existing controls to URL changes without Redux', async () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CatalogRouter initialEntries={['/?category=laptops&page=3&campaign=sale']}>
      {children}
    </CatalogRouter>
  )
  const { result } = renderHook(
    () => ({ ...useFilters(), location: useLocation() }),
    { wrapper }
  )
  await act(async () => {
    result.current.handleFilters(FilterName.Category, 'phones')
  })
  await waitFor(() =>
    expect(result.current.location.search).toContain('category=phones')
  )
  expect(
    new URLSearchParams(result.current.location.search).getAll('category')
  ).toEqual(['laptops', 'phones'])
  expect(result.current.location.search).not.toContain('page=')
  await act(async () => {
    result.current.handleFilters(FilterName.Category, 'laptops')
  })
  await waitFor(() =>
    expect(result.current.location.search).not.toContain('category=laptops')
  )
  expect(
    new URLSearchParams(result.current.location.search).getAll('category')
  ).toEqual(['phones'])
  await act(async () => {
    result.current.handleClearButton()
  })
  await waitFor(() =>
    expect(result.current.location.search).toBe('?campaign=sale')
  )
  expect(result.current.location.search).toBe('?campaign=sale')
})
