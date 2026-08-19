import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'

import CartDrawer from '@/components/cart/CartDrawer'
import cartReducer from '@/redux/features/cartSlice'
import { Product } from '@/shared/types/productsType'

const product: Product = {
  id: 'product-1',
  name: 'Test product',
  description: 'Description',
  image: 'https://example.com/product.jpg',
  images: [],
  price: 125,
  category: 'Test',
}

describe('CartDrawer', () => {
  it('updates the visible item count and removes the product', async () => {
    const user = userEvent.setup()
    const store = configureStore({
      reducer: { cart: cartReducer },
      preloadedState: {
        cart: {
          items: [{ product, quantity: 2 }],
          isOpen: true,
          isHydrated: true,
        },
      },
    })

    render(
      <Provider store={store}>
        <CartDrawer />
      </Provider>
    )

    expect(screen.getByRole('dialog', { name: /cart/i })).toBeVisible()
    expect(screen.getByRole('heading', { name: /cart 2/i })).toBeVisible()
    expect(screen.getByText('$250.00')).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: 'Increase quantity of Test product' })
    )

    expect(screen.getByRole('heading', { name: /cart 3/i })).toBeVisible()
    expect(screen.getByText('$375.00')).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: 'Remove Test product from cart' })
    )

    expect(screen.getByText('Your cart is empty')).toBeVisible()
    expect(screen.getByRole('heading', { name: /cart 0/i })).toBeVisible()
  })
})
