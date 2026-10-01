import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import Favorites from '@/components/favorites/Favorites'
import cart from '@/redux/features/cartSlice'
import favorite, { addFavorite } from '@/redux/features/favoriteSlice'

const products = ['Phone', 'Laptop', 'Tablet'].map((name, index) => ({
  id: String(index),
  name,
  price: 100,
  description: '',
  category: 'electronics',
  image: '',
  images: [],
}))

function setup() {
  const store = configureStore({ reducer: { cart, favorite } })
  products.forEach(product => store.dispatch(addFavorite(product)))
  render(
    <Provider store={store}>
      <MemoryRouter>
        <Favorites />
      </MemoryRouter>
    </Provider>
  )
  return store
}

function displayedOrder() {
  return screen
    .getAllByRole('listitem')
    .map(item => within(item).getByRole('heading').textContent)
}

it('moves the selected favorite with the keyboard and updates the boundary buttons', async () => {
  const user = userEvent.setup()
  const store = setup()
  expect(screen.getByRole('button', { name: 'Move Phone up' })).toBeDisabled()
  expect(
    screen.getByRole('button', { name: 'Move Tablet down' })
  ).toBeDisabled()

  screen.getByRole('button', { name: 'Move Phone down' }).focus()
  await user.keyboard('{Enter}')
  expect(displayedOrder()).toEqual(['Laptop', 'Phone', 'Tablet'])
  expect(
    store.getState().favorite.favorites_products.map(product => product.name)
  ).toEqual(['Laptop', 'Phone', 'Tablet'])
  expect(screen.getByRole('button', { name: 'Move Laptop up' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Move Phone up' })).toBeEnabled()

  screen.getByRole('button', { name: 'Move Phone up' }).focus()
  await user.keyboard(' ')
  expect(displayedOrder()).toEqual(['Phone', 'Laptop', 'Tablet'])
  expect(screen.getByRole('button', { name: 'Move Phone up' })).toBeDisabled()

  const laptopRow = screen
    .getByRole('heading', { name: 'Laptop' })
    .closest('li')!
  fireEvent.click(within(laptopRow).getByRole('button', { name: 'Delete' }))
  expect(
    store.getState().favorite.favorites_products.map(product => product.name)
  ).toEqual(['Phone', 'Tablet'])
})

it('reorders from the focused handle with arrow keys and respects list boundaries', async () => {
  const user = userEvent.setup()
  setup()
  const handle = screen.getByRole('button', { name: 'Drag to reorder Phone' })
  handle.focus()
  await user.keyboard('{ArrowUp}')
  expect(displayedOrder()).toEqual(['Phone', 'Laptop', 'Tablet'])
  await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
  expect(displayedOrder()).toEqual(['Laptop', 'Tablet', 'Phone'])
  expect(handle).toHaveFocus()
  await user.keyboard('{ArrowUp}')
  expect(displayedOrder()).toEqual(['Laptop', 'Phone', 'Tablet'])
})
