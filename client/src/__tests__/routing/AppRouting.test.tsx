import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { mockFetch, jsonResponse } from '../support/fetch'
import App from '@/App'
import { store } from '@/redux/store'
import { clearCart, closeCart } from '@/redux/features/cartSlice'
import { setGridView, setListView } from '@/redux/features/catalogViewSlice'
import { removeFavorite } from '@/redux/features/favoriteSlice'

// External carousel/AI UI is not part of this routing test. Product UI stays real.
jest.mock('@/components/home/sections/Slider', () => () => null)
jest.mock('@/components/chat/Chat', () => () => null)
const products = [
  {
    id: 'phone one',
    name: 'Fixture Phone',
    description: 'Phone description',
    category: 'phones',
    price: 125,
    image: '/phone.png',
    images: ['/phone.png'],
  },
  {
    id: 'laptop',
    name: 'Fixture Laptop',
    description: 'Laptop description',
    category: 'laptops',
    price: 500,
    image: '/laptop.png',
    images: ['/laptop.png'],
  },
]
function HistoryControls() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <>
      <output data-testid="location">
        {location.pathname + location.search}
      </output>
      <button onClick={() => navigate(-1)}>Test back</button>
      <button onClick={() => navigate(1)}>Test forward</button>
      <button onClick={() => navigate('/?text=Fixture+Laptop')}>
        Test laptop filter
      </button>
      <button onClick={() => navigate('/product/laptop')}>
        Test other product
      </button>
    </>
  )
}
function setup(url = '/') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <HistoryControls />
      <App />
    </MemoryRouter>
  )
}
beforeEach(() => {
  localStorage.clear()
  window.history.replaceState({}, '', '/')
  store.dispatch(clearCart())
  store.dispatch(closeCart())
  for (const item of store.getState().favorite.favorites_products)
    store.dispatch(removeFavorite(item.id))
  mockFetch.mockImplementation(async url => {
    if (String(url).startsWith('/api/products/catalog?')) {
      const params = new URL(String(url), 'http://localhost').searchParams
      const selected = products.filter(p => !params.get('text') || p.name.toLowerCase().startsWith(params.get('text')!.toLowerCase()))
      return jsonResponse({ items: selected, total: selected.length, page: 1, pageSize: 6, min_price: 125, max_price: 500 })
    }
    if (url === '/api/products') return jsonResponse(products)
    const product = products.find(
      p => '/api/products/' + encodeURIComponent(p.id) === url
    )
    if (!product) return jsonResponse({ error: 'Not found' }, 404)
    return jsonResponse(product)
  })
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    }),
  })
})

it('matches contact from the router location and keeps a shared shell', async () => {
  setup('/contact')
  expect(
    await screen.findByRole('heading', { name: 'Contact Us' })
  ).toBeVisible()
  expect(screen.getAllByRole('link', { name: 'VOLT home' })).toHaveLength(1)
  expect(document.title).toBe('Contact | React App')
})

it('renders the home catalog and opens an encoded dynamic product link', async () => {
  setup()
  expect(
    await screen.findByRole('heading', { name: 'Fixture Phone' })
  ).toBeVisible()
  const link = document.querySelector('a[href="/product/phone%20one"]')
  expect(link).not.toBeNull()
  fireEvent.click(link!)
  expect(
    await screen.findByRole('button', { name: 'Buy Fixture Phone' })
  ).toBeVisible()
  expect(screen.getByTestId('location')).toHaveTextContent(
    '/product/phone%20one'
  )
})

it('loads a direct product URL and changes ID without stale product UI', async () => {
  setup('/product/phone%20one')
  expect(
    await screen.findByRole('button', { name: 'Buy Fixture Phone' })
  ).toBeVisible()
  expect(screen.getAllByRole('main')).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Test other product' }))
  expect(
    await screen.findByRole('button', { name: 'Buy Fixture Laptop' })
  ).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Buy Fixture Phone' })
  ).not.toBeInTheDocument()
})

it('keeps cart state across navigation and follows a cart product link', async () => {
  setup('/product/phone%20one')
  fireEvent.click(
    await screen.findByRole('button', { name: 'Buy Fixture Phone' })
  )
  fireEvent.click(screen.getAllByRole('link', { name: 'contact' })[0])
  expect(
    await screen.findByRole('heading', { name: 'Contact Us' })
  ).toBeVisible()
  fireEvent.click(
    screen.getAllByRole('button', { name: 'Open cart, 1 items' })[0]
  )
  const dialog = screen.getByRole('dialog', { name: /cart/i })
  fireEvent.click(within(dialog).getByRole('link', { name: 'Fixture Phone' }))
  expect(
    await screen.findByRole('button', { name: 'Buy Fixture Phone' })
  ).toBeVisible()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('renders favorites and uses browser-style back and forward navigation', async () => {
  setup('/contact')
  await screen.findByRole('heading', { name: 'Contact Us' })
  fireEvent.click(screen.getAllByRole('link', { name: 'favorites' })[0])
  await screen.findByRole('heading', { name: 'Wishlist' })
  expect(screen.getByTestId('location')).toHaveTextContent('/favorites')
  expect(document.title).toBe('Favorites | React App')
  fireEvent.click(screen.getByRole('button', { name: 'Test back' }))
  expect(
    await screen.findByRole('heading', { name: 'Contact Us' })
  ).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Test forward' }))
  expect(screen.getByTestId('location')).toHaveTextContent('/favorites')
})

it('restores query filter controls and catalog on history navigation', async () => {
  setup('/?text=Fixture+Phone&category=phones')
  expect(
    await screen.findByRole('heading', { name: 'Fixture Phone' })
  ).toBeVisible()
  expect(screen.getByRole('searchbox')).toHaveValue('Fixture Phone')
  fireEvent.click(screen.getByRole('button', { name: 'Test laptop filter' }))
  await waitFor(() =>
    expect(screen.getByRole('searchbox')).toHaveValue('Fixture Laptop')
  )
  expect(
    await screen.findByRole('heading', { name: 'Fixture Laptop' })
  ).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Test back' }))
  await waitFor(() =>
    expect(screen.getByRole('searchbox')).toHaveValue('Fixture Phone')
  )
  fireEvent.click(screen.getByRole('button', { name: 'Test forward' }))
  await waitFor(() =>
    expect(screen.getByRole('searchbox')).toHaveValue('Fixture Laptop')
  )
})

it('commits query edits without resetting unrelated URL params', async () => {
  setup('/?campaign=spring')
  await screen.findByRole('heading', { name: 'Fixture Phone' })
  jest.mocked(window.scrollTo).mockClear()
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'Fixture Phone' },
  })
  await waitFor(() =>
    expect(screen.getByTestId('location')).toHaveTextContent(
      'text=Fixture+Phone'
    )
  )
  expect(screen.getByTestId('location')).toHaveTextContent('campaign=spring')
  expect(window.scrollTo).not.toHaveBeenCalled()
})

it('does not apply a pending filter commit after leaving the catalog', async () => {
  setup()
  await screen.findByRole('heading', { name: 'Fixture Phone' })
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'pending' },
  })
  fireEvent.click(screen.getAllByRole('link', { name: 'contact' })[0])
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 600))
  })
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/contact$/)
})

it('renders an unknown-route 404 and replaces it with home after the delay', async () => {
  jest.useFakeTimers()
  const view = setup('/missing/path')
  expect(
    screen.getByRole('heading', { name: '404 - Page Not Found' })
  ).toBeVisible()
  act(() => {
    jest.advanceTimersByTime(2500)
  })
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
  fireEvent.click(screen.getByRole('button', { name: 'Test back' }))
  expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/)
  view.unmount()
  jest.useRealTimers()
})

it('preserves remembered view preference when leaving the catalog', async () => {
  setup()
  await screen.findByRole('heading', { name: 'Fixture Phone' })
  fireEvent.click(screen.getByRole('button', { name: 'List view' }))
  expect(localStorage.getItem('grid_view')).toBe('false')
  fireEvent.click(screen.getAllByRole('link', { name: 'contact' })[0])
  await screen.findByRole('heading', { name: 'Contact Us' })
  expect(localStorage.getItem('grid_view')).toBe('false')
})

it('keeps search draft local, preserves focus on commit and resets only owned URL state', async () => {
 setup('/?campaign=sale&page=2')
 await screen.findByRole('heading', { name: 'Fixture Phone' })
 const input=screen.getByRole('searchbox');input.focus()
 fireEvent.change(input,{target:{value:'Fixture Laptop'}})
 expect(input).toHaveValue('Fixture Laptop')
 expect(screen.getByTestId('location')).not.toHaveTextContent('text=')
 await waitFor(()=>expect(screen.getByTestId('location')).toHaveTextContent('text=Fixture+Laptop'))
 expect(input).toHaveFocus()
 expect(screen.getByTestId('location')).not.toHaveTextContent('page=')
 fireEvent.change(screen.getByRole('combobox'),{target:{value:'name-z'}})
 expect(screen.getByTestId('location')).toHaveTextContent('sort=name-z')
 fireEvent.click(screen.getByRole('button',{name:/clear filters/i}))
 expect(screen.getByTestId('location')).toHaveTextContent(/^\/\?campaign=sale$/)
 expect(input).toHaveValue('')
 expect(screen.getByRole('combobox')).toHaveValue('price-lowest')
})


it.each([true, false])('keeps the mobile catalog anchor in grid mode %s, including empty results', async grid => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} })
  store.dispatch(grid ? setGridView() : setListView())
  const view = setup()
  await screen.findByRole('heading', { name: 'Fixture Phone' })
  expect(document.querySelectorAll('#collection')).toHaveLength(1)
  expect(document.getElementById('collection')).toContainElement(screen.getByRole('heading', { name: 'Fixture Phone' }))
  view.unmount()
  setup('/?text=missing')
  const empty = await screen.findByText('Sorry, no products matched your search...')
  expect(document.getElementById('collection')).toContainElement(empty)
  act(() => store.dispatch(setGridView()))
})
