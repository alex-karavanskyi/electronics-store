import filterReducer, {
  clearFilters,
  initializeFilters,
  setGridView,
  setListView,
  updateFilters,
  updateSort,
} from '@/redux/features/filterSlice'
import { Product } from '@/shared/types/productsType'
import { filterProducts, getPriceBounds } from '@/shared/utils/filterProducts'

const products: Product[] = [
  {
    id: '1',
    name: 'Phone',
    category: 'phones',
    price: 100,
    image: '',
    images: [],
    description: '',
  },
  {
    id: '2',
    name: 'Laptop',
    category: 'laptops',
    price: 200,
    image: '',
    images: [],
    description: '',
  },
]
const filters = { text: '', category: [], price: null }

describe('client filter state', () => {
  it('starts without a price limit', () => {
    expect(filterReducer(undefined, { type: 'init' })).toEqual({
      filters,
      sort: 'price-lowest',
      grid_view: true,
    })
  })
  it('changes view, sort and filters', () => {
    let state = filterReducer(undefined, setListView())
    expect(state.grid_view).toBe(false)
    state = filterReducer(state, setGridView())
    expect(state.grid_view).toBe(true)
    state = filterReducer(state, updateSort('name-z'))
    expect(state.sort).toBe('name-z')
    state = filterReducer(
      state,
      updateFilters({ name: 'text', value: 'phone' })
    )
    expect(state.filters.text).toBe('phone')
  })
  it('initializes URL choices including zero, and clears only choices', () => {
    const state = filterReducer(
      undefined,
      initializeFilters({
        text: 'Phone',
        category: ['phones'],
        price: 0,
        sort: 'name-z',
      })
    )
    expect(state.filters.price).toBe(0)
    expect(state.filters.category).toEqual(['phones'])
    expect(filterReducer(state, clearFilters())).toEqual({
      filters,
      sort: 'price-lowest',
      grid_view: state.grid_view,
    })
  })
})

describe('derived catalog', () => {
  it.each([
    ['price-lowest', ['1', '2']],
    ['price-highest', ['2', '1']],
    ['name-a', ['2', '1']],
    ['name-z', ['1', '2']],
  ])('sorts by %s without mutating source products', (sort, ids) => {
    expect(filterProducts(products, filters, sort).map(p => p.id)).toEqual(ids)
    expect(products.map(p => p.id)).toEqual(['1', '2'])
  })
  it('combines search, category and price', () => {
    expect(
      filterProducts(
        products,
        { text: 'pH', category: ['phones'], price: 100 },
        'name-a'
      ).map(p => p.id)
    ).toEqual(['1'])
    expect(
      filterProducts(products, { ...filters, price: 99 }, 'name-a')
    ).toEqual([])
    expect(
      filterProducts(products, { ...filters, category: ['missing'] }, 'name-a')
    ).toEqual([])
  })
  it('derives finite bounds for empty and equal-priced catalogs', () => {
    expect(getPriceBounds([])).toEqual({ min_price: 0, max_price: 0 })
    expect(getPriceBounds([products[0]])).toEqual({
      min_price: 100,
      max_price: 100,
    })
    expect(getPriceBounds(products)).toEqual({ min_price: 100, max_price: 200 })
  })
})
