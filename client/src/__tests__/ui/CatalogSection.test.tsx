import { act, fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'

import CatalogSection from '@/components/home/CatalogSection'
import { setGridView, setListView } from '@/redux/features/catalogViewSlice'
import { store } from '@/redux/store'
import { useCatalog } from '@/components/home/hooks/useCatalog'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useProducts } from '@/shared/hooks/useProducts'

jest.mock('@/components/home/hooks/useCatalog')
jest.mock('@/shared/hooks/useIsMobile')
jest.mock('@/shared/hooks/useProducts')

const product = {
  id: 'phone',
  name: 'Fixture Phone',
  price: 125,
  category: 'phones',
  description: 'Phone description',
  image: '/phone.png',
  images: ['/phone.png'],
}
const catalog = {
  products: [product],
  total: 12,
  pageSize: 6,
  isPending: false,
  isLoadingError: false,
  isFetching: false,
  sort: 'price-lowest' as const,
  filters: { text: '', category: [], price: 300, min_price: 0, max_price: 300 },
  refetch: jest.fn(),
}
const mockCatalog = jest.mocked(useCatalog)
const mockIsMobile = jest.mocked(useIsMobile)

beforeEach(() => {
  jest.clearAllMocks()
  store.dispatch(setGridView())
  mockIsMobile.mockReturnValue(false)
  mockCatalog.mockReturnValue(catalog)
  jest.mocked(useProducts).mockReturnValue({
    data: [product],
    isPending: false,
    error: null,
    isFetching: false,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useProducts>)
})

function setup() {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <CatalogSection />
      </MemoryRouter>
    </Provider>
  )
}

it.each([false, true])(
  'preserves grid, list and catalog controls with mobile=%s',
  isMobile => {
    mockIsMobile.mockReturnValue(isMobile)
    setup()
    const anchor = screen.getByRole('region', { name: 'Product catalog' })
    expect(anchor).toHaveAttribute('id', 'collection')
    expect(anchor).toHaveAttribute('tabindex', '-1')
    expect(
      screen.getByRole('link', { name: 'View Fixture Phone' })
    ).toBeVisible()
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
      'href',
      '/?page=2'
    )
    expect(screen.queryByText('Refine your search') !== null).toBe(!isMobile)
    expect(
      screen.queryByRole('group', { name: 'View mode toggle' }) !== null
    ).toBe(!isMobile)

    act(() => {
      store.dispatch(setListView())
    })
    expect(screen.getByRole('link', { name: 'Details' })).toBeVisible()
    expect(screen.queryByRole('link', { name: '2' })).not.toBeInTheDocument()
  }
)

it.each([false, true])(
  'distinguishes loading, empty results and errors with mobile=%s',
  isMobile => {
    mockIsMobile.mockReturnValue(isMobile)
    mockCatalog.mockReturnValue({
      ...catalog,
      products: [],
      total: 0,
      isPending: true,
    })
    const view = setup()
    const rerender = () =>
      view.rerender(
        <Provider store={store}>
          <MemoryRouter>
            <CatalogSection />
          </MemoryRouter>
        </Provider>
      )
    expect(
      view.container.querySelectorAll('.grid__view-skeleton-img')
    ).toHaveLength(6)
    expect(screen.queryByText(/no products matched/)).not.toBeInTheDocument()

    mockCatalog.mockReturnValue({ ...catalog, products: [], total: 0 })
    rerender()
    expect(
      screen.getByText('Sorry, no products matched your search...')
    ).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    mockCatalog.mockReturnValue({
      ...catalog,
      products: [],
      isLoadingError: true,
    })
    rerender()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unable to load products'
    )
    expect(screen.queryByText(/no products matched/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(catalog.refetch).toHaveBeenCalledTimes(1)
  }
)

it('reserves the largest desktop height, resets on view changes and disconnects the observer', () => {
  let height = 500.2
  const measure = jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(() => ({ height }) as DOMRect)
  let onResize!: () => void
  const disconnect = jest.fn()
  const observe = jest.fn()
  const originalObserver = Object.getOwnPropertyDescriptor(
    globalThis,
    'ResizeObserver'
  )
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: jest.fn().mockImplementation((callback: () => void) => {
      onResize = callback
      return { observe, disconnect }
    }),
  })
  try {
    const { container, unmount } = setup()
    const panel = container.querySelector<HTMLElement>('.productsPanel')!
    const reservedHeight = () =>
      panel.style.getPropertyValue('--reserved-products-height')
    expect(reservedHeight()).toBe('501px')
    expect(observe).toHaveBeenCalledWith(
      container.querySelector('.productsContent')
    )
    height = 200
    act(() => onResize())
    expect(reservedHeight()).toBe('501px')
    height = 700
    act(() => onResize())
    expect(reservedHeight()).toBe('700px')
    height = 300
    act(() => {
      store.dispatch(setListView())
    })
    expect(reservedHeight()).toBe('300px')
    expect(disconnect).toHaveBeenCalledTimes(1)
    unmount()
    expect(disconnect).toHaveBeenCalledTimes(2)
  } finally {
    measure.mockRestore()
    if (originalObserver)
      Object.defineProperty(globalThis, 'ResizeObserver', originalObserver)
    else Reflect.deleteProperty(globalThis, 'ResizeObserver')
  }
})

it('disables the retry action while the catalog request is in progress', () => {
  mockCatalog.mockReturnValue({
    ...catalog,
    products: [],
    isLoadingError: true,
    isFetching: true,
  })
  setup()
  const retry = screen.getByRole('button', { name: 'Retrying...' })
  expect(retry).toBeDisabled()
  fireEvent.click(retry)
  expect(catalog.refetch).not.toHaveBeenCalled()
})
