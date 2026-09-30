import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { mockFetch, jsonResponse } from '../support/fetch'
import Category from '@/components/home/filters/Category'
import { useProductFilters } from '@/components/home/hooks/useProductFilters'
import { useFilters } from '@/components/home/hooks/useFilters'

function CategoryControls() {
  const { filters } = useProductFilters()
  const { handleFilters } = useFilters()
  const { search } = useLocation()
  return (
    <>
      <Category
        selectedCategories={filters.category}
        handleFilters={handleFilters}
      />
      <output aria-label="Catalog URL">{search}</output>
    </>
  )
}

it('shows unique categories in their original order and applies a category to the URL', async () => {
  mockFetch.mockReset()
  mockFetch.mockResolvedValue(
    jsonResponse(
      ['laptops', 'phones', 'laptops'].map((category, index) => ({
        id: String(index),
        name: 'Product',
        price: 100,
        category,
        description: '',
        image: '',
        images: [],
      }))
    )
  )
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/?category=phones&page=3&campaign=sale']}>
        <CategoryControls />
      </MemoryRouter>
    </QueryClientProvider>
  )
  try {
    const categories = await screen.findAllByRole('checkbox')
    expect(categories).toHaveLength(2)
    expect(categories[0]).toHaveAccessibleName('laptops')
    expect(categories[1]).toHaveAccessibleName('phones')
    expect(categories[1]).toBeChecked()
    fireEvent.click(categories[0])
    expect(categories[0]).toBeChecked()
    const params = new URLSearchParams(
      screen.getByRole('status', { name: 'Catalog URL' }).textContent ?? ''
    )
    expect(params.getAll('category')).toEqual(['laptops', 'phones'])
    expect(params.has('page')).toBe(false)
    expect(params.get('campaign')).toBe('sale')
  } finally {
    view.unmount()
    client.clear()
  }
})
