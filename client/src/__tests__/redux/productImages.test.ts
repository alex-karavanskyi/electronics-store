import cartReducer, {
  hydrateCart,
  removeFromCart,
} from '@/redux/features/cartSlice'

const product = {
  id: 'one',
  name: 'Old',
  price: 12.5,
  description: 'Old description',
  category: 'Old category',
  image: 'old',
  images: ['old'],
}
const fresh = {
  ...product,
  name: 'New',
  price: 999,
  image: 'new',
  images: ['new', 'second'],
}

it('refreshes only cart images, preserving quantity, order and UI state', () => {
  const initial = cartReducer(
    undefined,
    hydrateCart([
      { product, quantity: 3 },
      { product: { ...product, id: 'two' }, quantity: 2 },
    ])
  )
  const action = { type: 'cart/updateCartProductImages', payload: fresh }
  const state = cartReducer(initial, action)
  expect(state).toEqual({
    ...initial,
    items: [
      {
        product: { ...product, image: 'new', images: ['new', 'second'] },
        quantity: 3,
      },
      initial.items[1],
    ],
  })
  const removed = cartReducer(state, removeFromCart('one'))
  expect(cartReducer(removed, action)).toEqual(removed)
})
