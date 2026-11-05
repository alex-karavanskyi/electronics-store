import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CartDrawer from '@/components/cart/CartDrawer'
import { addToCart, openCart } from '@/redux/features/cartSlice'
import { Provider } from 'react-redux'
import { toast } from 'sonner'
import { createAppStore } from '@/redux/store'
import ThemeProvider from '@/shared/lib/ThemeProvider'
import AppToaster from '@/shared/ui/AppToaster'
import CartButton from '@/shared/ui/CartButton'

afterEach(() => toast.dismiss())

it('dismisses cart confirmations when opening the cart but preserves errors', async () => {
  const store = createAppStore()
  store.dispatch(
    addToCart({
      id: 'toast-phone',
      name: 'Phone',
      price: 10,
      description: '',
      category: '',
      image: '',
      images: [],
    })
  )
  render(
    <MemoryRouter>
      <Provider store={store}>
        <ThemeProvider>
          <AppToaster />
          <CartDrawer />
        </ThemeProvider>
      </Provider>
    </MemoryRouter>
  )
  act(() => {
    toast.success('Phone added to cart', { id: 'cart-toast-phone' })
    toast.success('Laptop added to cart', { id: 'cart-toast-laptop' })
    toast.error('Unable to save product', { id: 'product-write-error' })
  })
  expect(await screen.findByText('Phone added to cart')).toBeInTheDocument()
  act(() => {
    store.dispatch(openCart())
  })
  expect(screen.getByRole('link', { name: 'Checkout' })).toBeVisible()
  await waitFor(() => {
    expect(screen.queryByText('Phone added to cart')).not.toBeInTheDocument()
    expect(screen.queryByText('Laptop added to cart')).not.toBeInTheDocument()
  })
  expect(screen.getByText('Unable to save product')).toBeInTheDocument()
})

it('confirms cart additions without duplicating toasts on repeated clicks', async () => {
  const store = createAppStore()
  const product = {
    id: 'toast-phone',
    name: 'Phone',
    price: 10,
    description: '',
    category: '',
    image: '',
    images: [],
  }
  render(
    <Provider store={store}>
      <ThemeProvider>
        <AppToaster />
        <CartButton product={product} />
      </ThemeProvider>
    </Provider>
  )
  const button = screen.getByRole('button', { name: 'Add Phone to cart' })
  fireEvent.click(button)
  expect(await screen.findByText('Phone added to cart')).toBeVisible()
  fireEvent.click(button)
  expect(screen.getAllByText('Phone added to cart')).toHaveLength(1)
  expect(store.getState().cart.items[0].quantity).toBe(2)
})
