import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import favoriteReducer from '@/redux/features/favoriteSlice'
import FavoriteButton from '@/shared/ui/FavoriteButton'
import { Product } from '@/shared/types/productsType'

const product: Product = {
  id: 'one',
  name: 'Test phone',
  price: 10,
  description: 'Phone',
  image: '',
  images: [],
  category: 'phones',
}

it('toggles favorites using both Enter and Space and exposes the pressed state', async () => {
  const user = userEvent.setup()
  const store = configureStore({ reducer: { favorite: favoriteReducer } })
  render(
    <Provider store={store}>
      <FavoriteButton product={product} />
    </Provider>
  )
  await user.tab()
  const button = screen.getByRole('button', { name: 'Favorite Test phone' })
  expect(button).toHaveFocus()
  expect(button).toHaveAttribute('aria-pressed', 'false')
  await user.keyboard('{Enter}')
  expect(button).toHaveAttribute('aria-pressed', 'true')
  expect(store.getState().favorite.favorites_products).toEqual([product])
  await user.keyboard(' ')
  expect(button).toHaveAttribute('aria-pressed', 'false')
  expect(store.getState().favorite.favorites_products).toEqual([])
})
