import reducer, {
  addToCart,
  clearCart,
  closeCart,
  decrementQuantity,
  hydrateCart,
  incrementQuantity,
  openCart,
  removeFromCart,
} from '@/redux/features/cartSlice'
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

describe('cartSlice', () => {
  it('adds a product and increments it when added again', () => {
    let state = reducer(undefined, addToCart(product))
    state = reducer(state, addToCart(product))

    expect(state.items).toEqual([{ product, quantity: 2 }])
  })

  it('increments, decrements, and removes an item at quantity one', () => {
    let state = reducer(undefined, addToCart(product))
    state = reducer(state, incrementQuantity(product.id))
    expect(state.items[0].quantity).toBe(2)

    state = reducer(state, decrementQuantity(product.id))
    expect(state.items[0].quantity).toBe(1)

    state = reducer(state, decrementQuantity(product.id))
    expect(state.items).toEqual([])
  })

  it('removes one item and clears the whole cart', () => {
    let state = reducer(undefined, addToCart(product))
    state = reducer(state, removeFromCart(product.id))
    expect(state.items).toEqual([])

    state = reducer(state, addToCart(product))
    state = reducer(state, clearCart())
    expect(state.items).toEqual([])
  })

  it('opens and closes the drawer', () => {
    let state = reducer(undefined, openCart())
    expect(state.isOpen).toBe(true)

    state = reducer(state, closeCart())
    expect(state.isOpen).toBe(false)
  })

  it('hydrates persisted items', () => {
    const state = reducer(undefined, hydrateCart([{ product, quantity: 3 }]))

    expect(state.items).toEqual([{ product, quantity: 3 }])
    expect(state.isHydrated).toBe(true)
  })
})
