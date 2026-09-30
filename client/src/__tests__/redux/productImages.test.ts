import cartReducer, {
  hydrateCart,
  removeFromCart,
} from '@/redux/features/cartSlice'
import favoriteReducer, {
  addFavorite,
  removeFavorite,
} from '@/redux/features/favoriteSlice'

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

it('refreshes only favorite images, including an empty gallery, preserving order', () => {
  let state = favoriteReducer(undefined, addFavorite(product))
  state = favoriteReducer(state, addFavorite({ ...product, id: 'two' }))
  const action = {
    type: 'favorite/updateFavoriteProductImages',
    payload: { ...fresh, image: '', images: [] },
  }
  state = favoriteReducer(state, action)
  expect(state.favorites_products).toEqual([
    { ...product, image: '', images: [] },
    { ...product, id: 'two' },
  ])
  const removed = favoriteReducer(state, removeFavorite('one'))
  expect(favoriteReducer(removed, action)).toEqual(removed)
})
