import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import cartReducer from '@/redux/features/cartSlice'
import CartDrawer from '@/components/cart/CartDrawer'
import CheckoutPage from '@/pages/CheckoutPage'

const product = {
  id: 'phone',
  name: 'Test phone',
  description: '',
  image: '/phone.png',
  images: [],
  price: 125,
  category: 'phones',
}

function setup(empty = false, drawer = false) {
  const store = configureStore({
    reducer: { cart: cartReducer },
    preloadedState: {
      cart: {
        items: empty ? [] : [{ product, quantity: 2 }],
        isOpen: drawer,
        isHydrated: true,
      },
    },
  })
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[drawer ? '/' : '/checkout']}>
        <CartDrawer />
        <Routes>
          <Route path="/" element={<p>Shop</p>} />
          <Route path="/checkout" element={<CheckoutPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  )
  return store
}

it('opens checkout from the drawer, closes the modal and preserves items', async () => {
  const user = userEvent.setup()
  const store = setup(false, true)
  await user.click(screen.getByRole('link', { name: 'Checkout' }))
  expect(screen.getByRole('heading', { name: 'Checkout' })).toBeVisible()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(store.getState().cart.items[0].quantity).toBe(2)
  const order = screen.getByRole('complementary', { name: 'Your order' })
  expect(within(order).getAllByText('$250.00')).toHaveLength(2)
  await user.click(
    screen.getByRole('button', { name: 'Increase quantity of Test phone' })
  )
  expect(within(order).getAllByText('$375.00')).toHaveLength(2)
  await user.click(
    screen.getByRole('button', { name: 'Remove Test phone from cart' })
  )
  expect(screen.getByText('Your cart is empty')).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Place order' })
  ).not.toBeInTheDocument()
})

it('provides a way back to shopping for an empty checkout', () => {
  setup(true)
  expect(
    screen.getByRole('link', { name: 'Explore products' })
  ).toHaveAttribute('href', '/')
  expect(
    screen.queryByRole('button', { name: 'Place order' })
  ).not.toBeInTheDocument()
})

it('validates required fields and makes demo submission explicit without clearing the cart', async () => {
  const user = userEvent.setup()
  const store = setup()
  expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled()
  expect(screen.queryByText(/Your details are ready/)).not.toBeInTheDocument()
  await user.click(screen.getByText('Delivery details'))
  for (const [label, value] of Object.entries({
    'Full name': 'Alex Morgan',
    'Phone number': '+15550000000',
    Email: 'alex@example.com',
    'Street address': '12 Main Street',
    City: 'Kyiv',
    'Postal code': '01001',
    Country: 'Ukraine',
  })) {
    await user.type(screen.getByLabelText(label), value)
  }
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Place order' })).toBeEnabled()
  )
  await user.click(screen.getByRole('button', { name: 'Place order' }))
  expect(await screen.findByText(/no order has been placed/)).toBeVisible()
  expect(store.getState().cart.items).toHaveLength(1)
  await user.clear(screen.getByLabelText('Email'))
  expect(await screen.findByText('Email must be valid')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled()
  expect(screen.queryByText(/no order has been placed/)).not.toBeInTheDocument()
})

it('shows accessible inline errors while typing and clears them after correction', async () => {
  const user = userEvent.setup()
  setup()
  for (const [label, value, message] of [
    ['Full name', 'Al', 'Name must be at least 3 characters'],
    ['Email', 'invalid', 'Email must be valid'],
    ['Phone number', 'abcdefg', 'Enter a valid phone number (7–15 digits)'],
  ]) {
    await user.type(screen.getByLabelText(label), value)
    expect(await screen.findByText(message)).toBeVisible()
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText(label)).toHaveAccessibleDescription(message)
  }
  await user.clear(screen.getByLabelText('Phone number'))
  await user.type(screen.getByLabelText('Phone number'), '+380 (67) 123-45-67')
  await waitFor(() =>
    expect(screen.getByLabelText('Phone number')).toHaveAttribute(
      'aria-invalid',
      'false'
    )
  )
  expect(
    screen.queryByText('Enter a valid phone number (7–15 digits)')
  ).not.toBeInTheDocument()
})

it('rejects whitespace-only delivery fields and reveals hidden errors on form submission', async () => {
  const user = userEvent.setup()
  setup()
  await user.click(screen.getByText('Delivery details'))
  for (const label of ['Street address', 'City', 'Postal code', 'Country']) {
    await user.type(screen.getByLabelText(label), '   ')
    await waitFor(() =>
      expect(screen.getByLabelText(label)).toHaveAttribute(
        'aria-invalid',
        'true'
      )
    )
  }
  await user.click(screen.getByText('Delivery details'))
  fireEvent.submit(
    screen.getByRole('button', { name: 'Place order' }).closest('form')!
  )
  await waitFor(() =>
    expect(
      screen.getByLabelText('Street address').closest('details')
    ).toHaveAttribute('open')
  )
  expect(screen.queryByText(/no order has been placed/)).not.toBeInTheDocument()
})
