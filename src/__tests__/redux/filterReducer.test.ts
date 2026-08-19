import filterReducer, {
  clearFilters,
  filterProducts,
  loadProducts,
  setGridView,
  setListView,
  sortProducts,
  updateFilters,
  updateSort,
} from '@/redux/features/filterSlice'
import { Product } from '@/shared/types/productsType'
import { FilterState } from '@/shared/types/productsType'

const initialState: FilterState = {
  filtered_products: [],
  all_products: [],
  grid_view: true,
  sort: 'price-lowest',
  filters: {
    text: '',
    category: [],
    min_price: 0,
    max_price: 0,
    price: 0,
  },
}

describe('filterSlice', () => {
  it('should return the initial state', () => {
    expect(filterReducer(undefined, { type: undefined })).toEqual(initialState)
  })

  it('should load products and set max price', () => {
    const products: Product[] = [
      {
        id: '1',
        name: 'Product A',
        category: 'electronics',
        price: 100,
        image: '',
        description: '',
        images: [],
      },
      {
        id: '2',
        name: 'Product B',
        category: 'clothing',
        price: 200,
        image: '',
        description: '',
        images: [],
      },
    ]

    const nextState = filterReducer(initialState, loadProducts(products))

    expect(nextState.all_products).toEqual(products)
    expect(nextState.filters.max_price).toBe(200)
    expect(nextState.filters.price).toBe(200)
  })

  it('should set grid view', () => {
    const nextState = filterReducer(
      { ...initialState, grid_view: false },
      setGridView()
    )

    expect(nextState.grid_view).toBe(true)
  })

  it('should set list view', () => {
    const nextState = filterReducer(
      { ...initialState, grid_view: true },
      setListView()
    )

    expect(nextState.grid_view).toBe(false)
  })

  it('should update sort value', () => {
    const nextState = filterReducer(initialState, updateSort('price-highest'))

    expect(nextState.sort).toBe('price-highest')
  })

  it('should update filters', () => {
    const nextState = filterReducer(
      initialState,
      updateFilters({ name: 'text', value: 'new' })
    )

    expect(nextState.filters.text).toBe('new')
  })

  it('should filter products based on selected categories and price', () => {
    const stateWithProducts: FilterState = {
      ...initialState,
      all_products: [
        {
          id: '1',
          name: 'Product A',
          category: 'electronics',
          price: 100,
          image: '',
          description: '',
          images: [],
        },
        {
          id: '2',
          name: 'Product B',
          category: 'clothing',
          price: 200,
          image: '',
          description: '',
          images: [],
        },
      ],
      filters: {
        text: 'Product A',
        category: ['electronics'],
        min_price: 0,
        max_price: 200,
        price: 150,
      },
    }

    const nextState = filterReducer(stateWithProducts, filterProducts())

    expect(nextState.filtered_products).toEqual([
      {
        id: '1',
        name: 'Product A',
        category: 'electronics',
        price: 100,
        image: '',
        description: '',
        images: [],
      },
    ])
  })

  it('should show all products when no categories are selected', () => {
    const stateWithProducts: FilterState = {
      ...initialState,
      all_products: [
        {
          id: '1',
          name: 'Product A',
          category: 'electronics',
          price: 100,
          image: '',
          description: '',
          images: [],
        },
        {
          id: '2',
          name: 'Product B',
          category: 'clothing',
          price: 200,
          image: '',
          description: '',
          images: [],
        },
      ],
      filters: {
        text: '',
        category: [],
        min_price: 0,
        max_price: 200,
        price: 200,
      },
    }

    const nextState = filterReducer(stateWithProducts, filterProducts())

    expect(nextState.filtered_products).toHaveLength(2)
  })

  it('should sort products', () => {
    const stateWithFilteredProducts: FilterState = {
      ...initialState,
      filtered_products: [
        {
          id: '1',
          name: 'Product A',
          category: 'electronics',
          price: 100,
          image: '',
          description: '',
          images: [],
        },
        {
          id: '2',
          name: 'Product B',
          category: 'clothing',
          price: 200,
          image: '',
          description: '',
          images: [],
        },
      ],
    }

    const nextState = filterReducer(
      { ...stateWithFilteredProducts, sort: 'price-highest' },
      sortProducts()
    )

    expect(nextState.filtered_products).toEqual([
      {
        id: '2',
        name: 'Product B',
        category: 'clothing',
        price: 200,
        image: '',
        description: '',
        images: [],
      },
      {
        id: '1',
        name: 'Product A',
        category: 'electronics',
        price: 100,
        image: '',
        description: '',
        images: [],
      },
    ])
  })

  it('should clear filters', () => {
    const stateWithFilters: FilterState = {
      ...initialState,
      filters: {
        text: 'Product A',
        category: ['electronics'],
        min_price: 0,
        max_price: 200,
        price: 150,
      },
    }

    const nextState = filterReducer(stateWithFilters, clearFilters())

    expect(nextState.filters.text).toBe('')
    expect(nextState.filters.category).toEqual([])
    expect(nextState.filters.price).toBe(200)
    expect(nextState.sort).toBe('price-lowest')
  })
})
