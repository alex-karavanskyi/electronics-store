import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import GridView from '@/components/home/list/GridView'
import ListView from '@/components/home/list/ListView'
import Favorites from '@/components/favorites/Favorites'
import cart from '@/redux/features/cartSlice'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/shared/lib/queryClient'
import { productKeys } from '@/shared/hooks/useProducts'

beforeEach(() => localStorage.clear())

const product = {
  id: 'phone',
  name: 'Fixture Phone',
  price: 125,
  description: 'Phone description',
  category: 'phones',
  image: '/phone.png',
  images: ['/phone.png'],
}

it.each([
  ['grid', GridView],
  ['list', ListView],
] as const)(
  'keeps one title, price and working actions in the %s card',
  async (_name, View) => {
    const store = configureStore({ reducer: { cart } })
    const client = createQueryClient()
    render(
      <Provider store={store}>
        <QueryClientProvider client={client}>
          <MemoryRouter>
            <View products={[product]} isLoading={false} />
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    )

    expect(screen.getAllByRole('heading', { name: product.name })).toHaveLength(
      1
    )
    expect(screen.getAllByText('$125.00')).toHaveLength(1)
    const favoriteButton = screen.getByRole('button', {
      name: 'Favorite Fixture Phone',
    })
    fireEvent.click(favoriteButton)
    await waitFor(() =>
      expect(favoriteButton).toHaveAttribute('aria-pressed', 'true')
    )
    expect(JSON.parse(localStorage.getItem('volt_favorites')!).ids).toEqual([
      'phone',
    ])
    fireEvent.click(
      screen.getByRole('button', { name: 'Add Fixture Phone to cart' })
    )
    expect(store.getState().cart.items).toEqual([{ product, quantity: 1 }])
  }
)

it('keeps the wishlist title and price with its existing cart and delete actions', async () => {
  const store = configureStore({ reducer: { cart } })
  const client = createQueryClient()
  localStorage.setItem(
    'volt_favorites',
    JSON.stringify({ version: 1, ids: ['phone'] })
  )
  client.setQueryData(productKeys.detail('phone'), product)
  render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <Favorites />
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  )

  await waitFor(() =>
    expect(screen.getByRole('heading', { name: product.name })).toBeVisible()
  )
  expect(screen.getByText('$125.00')).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Favorite Fixture Phone' })
  ).not.toBeInTheDocument()
  fireEvent.click(
    screen.getByRole('button', { name: 'Add Fixture Phone to cart' })
  )
  expect(store.getState().cart.items).toEqual([{ product, quantity: 1 }])
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
  await waitFor(() =>
    expect(screen.getByText('Your wishlist is empty')).toBeVisible()
  )
})
