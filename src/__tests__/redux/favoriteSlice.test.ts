import reducer, {
  addFavorite,
  removeFavorite,
  toggleFavorite,
} from '@/redux/features/favoriteSlice'
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
