import reducer, {
  addFavorite,
  removeFavorite,
  toggleFavorite,
  setFavoriteOrder,
} from '@/redux/features/favoriteSlice'
import { Product } from '@/shared/types/productSchema'

const product: Product = {
  id: 'product-1',
  name: 'Test product',
  description: 'Description',
  image: 'https://example.com/product.jpg',
  images: [],
  price: 125,
  category: 'Test',
}

describe('favoriteSlice', () => {
  it('adds a favorite only once and removes it', () => {
    let state = reducer(undefined, addFavorite(product))
    state = reducer(state, addFavorite(product))

    expect(state.favorites_products).toEqual([product])

    state = reducer(state, removeFavorite(product.id))
    expect(state.favorites_products).toEqual([])
  })

  it('toggles a product in and out of favorites', () => {
    let state = reducer(undefined, toggleFavorite(product))
    expect(state.favorites_products).toEqual([product])

    state = reducer(state, toggleFavorite(product))
    expect(state.favorites_products).toEqual([])
  })
})

it('applies the full drag order and acknowledges repeated orders for the animation', () => {
  const second = { ...product, id: 'product-2', name: 'Second product' }
  let state = reducer(undefined, addFavorite(product))
  state = reducer(state, addFavorite(second))
  const action = setFavoriteOrder(['product-2', 'product-1'])
  state = reducer(state, action)
  expect(state.favorites_products).toEqual([second, product])
  const previous = state.favorites_products
  state = reducer(state, action)
  expect(state.favorites_products).toEqual([second, product])
  // Reorder.Group releases its reordering lock only after a controlled update.
  expect(state.favorites_products).not.toBe(previous)
})

it.each([
  { name: 'empty order', ids: [] },
  { name: 'missing product', ids: ['product-1'] },
  { name: 'duplicate product', ids: ['product-1', 'product-1'] },
  { name: 'unknown product', ids: ['product-1', 'unknown'] },
])('preserves favorites when the order contains $name', ({ ids }) => {
  const second = { ...product, id: 'product-2' }
  let state = reducer(undefined, addFavorite(product))
  state = reducer(state, addFavorite(second))
  const next = reducer(state, setFavoriteOrder(ids))
  expect(next.favorites_products).toEqual([product, second])
})
