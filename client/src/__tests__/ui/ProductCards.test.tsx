import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import GridView from '@/components/home/list/GridView'
import ListView from '@/components/home/list/ListView'
import Favorites from '@/components/favorites/Favorites'
import cart from '@/redux/features/cartSlice'
import favorite, { toggleFavorite } from '@/redux/features/favoriteSlice'

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
  (_name, View) => {
    const store = configureStore({ reducer: { cart, favorite } })
    render(
      <Provider store={store}>
        <MemoryRouter>
          <View products={[product]} isLoading={false} />
        </MemoryRouter>
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
    expect(favoriteButton).toHaveAttribute('aria-pressed', 'true')
    expect(store.getState().favorite.favorites_products).toEqual([product])
    fireEvent.click(
      screen.getByRole('button', { name: 'Add Fixture Phone to cart' })
    )
    expect(store.getState().cart.items).toEqual([{ product, quantity: 1 }])
  }
)

it('keeps the wishlist title and price with its existing cart and delete actions', async () => {
  const store = configureStore({ reducer: { cart, favorite } })
  store.dispatch(toggleFavorite(product))
  render(
    <Provider store={store}>
      <MemoryRouter>
        <Favorites />
      </MemoryRouter>
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
  expect(screen.getByText('Your wishlist is empty')).toBeVisible()
})
