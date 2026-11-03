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
import {
  decrementQuantity,
  incrementQuantity,
} from '@/redux/features/cartSlice'
import { QueryClientProvider, onlineManager } from '@tanstack/react-query'
import { createQueryClient } from '@/shared/lib/queryClient'
import { act, cleanup } from '@testing-library/react'
import { mockFetch, jsonResponse } from '../support/fetch'
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

const clients: ReturnType<typeof createQueryClient>[] = []
beforeEach(() => mockFetch.mockReset().mockResolvedValue(jsonResponse(product)))
afterEach(() => {
  cleanup()
  clients.splice(0).forEach(client => client.clear())
  onlineManager.setOnline(true)
})

function setup(empty = false, drawer = false) {
  const client = createQueryClient()
  clients.push(client)
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
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[drawer ? '/' : '/checkout']}>
          <CartDrawer />
          <Routes>
            <Route path="/" element={<p>Shop</p>} />
            <Route path="/checkout" element={<CheckoutPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
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

async function fillDetails() {
  for (const [label, value] of Object.entries({
    'Full name': 'Alex Morgan',
    'Phone number': '+15550000000',
    Email: 'alex@example.com',
    'Street address': '12 Main Street',
    City: 'Kyiv',
    'Postal code': '01001',
    Country: 'Ukraine',
  }))
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Place order' })).toBeEnabled()
  )
}

it('requires review of a remotely changed price before confirming checkout', async () => {
  const store = setup()
  await fillDetails()
  mockFetch.mockResolvedValue(
    jsonResponse({ ...product, name: 'Updated phone', price: 200 })
  )
  fireEvent.click(screen.getByRole('button', { name: 'Place order' }))
  await waitFor(() =>
    expect(store.getState().cart.items[0].product.price).toBe(200)
  )
  expect(screen.queryByText(/no order has been placed/)).not.toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent(/review/i)
  expect(screen.getAllByText('$400.00')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: 'Place order' }))
  expect(await screen.findByText(/no order has been placed/)).toBeVisible()
  act(() => store.dispatch(incrementQuantity(product.id)))
  expect(screen.queryByText(/no order has been placed/)).not.toBeInTheDocument()
  act(() => store.dispatch(decrementQuantity(product.id)))
  expect(screen.queryByText(/no order has been placed/)).not.toBeInTheDocument()
})

it.each([404, 503])(
  'does not confirm checkout on a %s product response',
  async status => {
    const store = setup()
    await fillDetails()
    mockFetch.mockResolvedValue(jsonResponse({ error: 'Unavailable' }, status))
    fireEvent.click(screen.getByRole('button', { name: 'Place order' }))
    await screen.findByRole('alert')
    expect(
      screen.queryByText(/no order has been placed/)
    ).not.toBeInTheDocument()
    expect(store.getState().cart.items).toHaveLength(status === 404 ? 0 : 1)
    if (status === 503) {
      mockFetch.mockResolvedValue(jsonResponse(product))
      fireEvent.click(screen.getByRole('button', { name: 'Place order' }))
      expect(await screen.findByText(/no order has been placed/)).toBeVisible()
    }
  }
)

it('does not confirm a cart or form edited while its product check is pending', async () => {
  const store = setup()
  await fillDetails()
  let resolve!: (response: Response) => void
  mockFetch.mockImplementation(
    () =>
      new Promise(done => {
        resolve = done
      })
  )
  fireEvent.click(screen.getByRole('button', { name: 'Place order' }))
  await waitFor(() => expect(mockFetch).toHaveBeenCalled())
  expect(screen.getByRole('button', { name: 'Place order' })).toBeDisabled()
  act(() => store.dispatch(incrementQuantity(product.id)))
  await act(async () => resolve(jsonResponse(product)))
  expect(screen.queryByText(/no order has been placed/)).not.toBeInTheDocument()
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Place order' })).toBeEnabled()
  )
  fireEvent.click(screen.getByRole('button', { name: 'Place order' }))
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2))
  fireEvent.change(screen.getByLabelText('Full name'), {
    target: { value: 'Other Person' },
  })
  await act(async () => resolve(jsonResponse(product)))
  expect(screen.queryByText(/no order has been placed/)).not.toBeInTheDocument()
})

it('ignores a product check completed after leaving checkout', async () => {
  const store = setup()
  await fillDetails()
  let resolve!: (response: Response) => void
  mockFetch.mockImplementation(
    () =>
      new Promise(done => {
        resolve = done
      })
  )
  fireEvent.click(screen.getByRole('button', { name: 'Place order' }))
  await waitFor(() => expect(mockFetch).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('link', { name: 'Continue shopping' }))
  await act(async () => resolve(jsonResponse({ ...product, price: 999 })))
  expect(store.getState().cart.items[0].product.price).toBe(125)
  expect(screen.queryByText(/no order has been placed/)).not.toBeInTheDocument()
})

it('offers retry instead of leaving checkout pending when the browser is offline', async () => {
  setup()
  await fillDetails()
  onlineManager.setOnline(false)
  mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))
  fireEvent.click(screen.getByRole('button', { name: 'Place order' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(/try again/i)
  expect(screen.getByRole('button', { name: 'Place order' })).toBeEnabled()
  expect(screen.queryByText(/no order has been placed/)).not.toBeInTheDocument()
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
