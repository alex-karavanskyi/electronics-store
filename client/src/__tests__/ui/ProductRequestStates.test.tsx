import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Provider } from 'react-redux'
import { mockFetch, jsonResponse } from '../support/fetch'
import { store } from '@/redux/store'
import { productKeys } from '@/shared/hooks/useProducts'
import SingleProduct from '@/components/product/SingleProduct'
import Category from '@/components/home/sections/Category'
import Slider from '@/components/home/sections/Slider'

// Keep query and application UI real; replace browser-only carousel and AI UI.
jest.mock('@/components/chat/Chat', () => () => null)
jest.mock('swiper/css', () => ({}))
jest.mock('swiper/css/effect-fade', () => ({}))
jest.mock('swiper/css/pagination', () => ({}))
jest.mock('swiper/modules', () => ({
  Autoplay: {},
  EffectFade: {},
  Pagination: {},
}))
jest.mock('swiper/react', () => ({
  Swiper: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SwiperSlide: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

const product = {
  id: 'phone',
  name: 'Fixture Phone',
  price: 125,
  category: 'phones',
  description: 'Phone description',
  image: '/phone.png',
  images: ['/phone.png'],
}
let client: QueryClient
beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  mockFetch.mockReset()
})
afterEach(() => {
  client.clear()
})
function Location() {
  return <div data-testid="location">{useLocation().pathname}</div>
}
function setup(ui: React.ReactNode, detail = false) {
  return render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[detail ? '/product/phone' : '/']}>
          <Location />
          <Routes>
            <Route path={detail ? '/product/:id' : '/'} element={ui} />
            <Route path="*" element={<p>Left product page</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  )
}

it('keeps a missing product on its URL and offers a catalog link instead of retry', async () => {
  mockFetch.mockResolvedValue(jsonResponse({ error: 'Not found' }, 404))
  jest.useFakeTimers()
  try {
    setup(<SingleProduct />, true)
    expect(
      await screen.findByRole('heading', { name: 'Product not found' })
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Back to catalog' })
    ).toHaveAttribute('href', '/')
    expect(
      screen.queryByRole('button', { name: /try again/i })
    ).not.toBeInTheDocument()
    await act(async () => {
      jest.advanceTimersByTime(4000)
    })
    expect(screen.getByTestId('location')).toHaveTextContent('/product/phone')
  } finally {
    jest.useRealTimers()
  }
})

it('recovers a failed product request in place when retry is clicked', async () => {
  mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Unavailable' }, 503))
  setup(<SingleProduct />, true)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to load product'
  )
  mockFetch.mockResolvedValue(jsonResponse(product))
  fireEvent.click(screen.getByRole('button', { name: /try again/i }))
  expect(
    await screen.findByRole('button', { name: 'Buy Fixture Phone' })
  ).toBeVisible()
  expect(screen.getByTestId('location')).toHaveTextContent('/product/phone')
})

it('shows category loading from its own pending list request', () => {
  mockFetch.mockImplementation(() => new Promise(() => {}))
  setup(<Category selectedCategories={[]} handleFilters={() => {}} />)
  expect(screen.getByRole('status')).toHaveTextContent('Loading categories')
})

it.each(['categories', 'featured products'] as const)(
  'recovers %s without treating failure as an empty list',
  async kind => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Unavailable' }, 503))
    setup(
      kind === 'categories' ? (
        <Category selectedCategories={[]} handleFilters={() => {}} />
      ) : (
        <Slider />
      )
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      `Unable to load ${kind}`
    )
    expect(
      screen.queryByText('Featured products will appear here soon.')
    ).not.toBeInTheDocument()
    mockFetch.mockResolvedValue(jsonResponse([product]))
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    if (kind === 'categories')
      expect(
        await screen.findByRole('checkbox', { name: 'phones' })
      ).toBeVisible()
    else expect(await screen.findByAltText('Fixture Phone')).toBeVisible()
  }
)

it.each(['categories', 'featured products', 'product'] as const)(
  'retains cached %s on a background failure and clears the warning after retry',
  async kind => {
    const detail = kind === 'product'
    const key = detail ? productKeys.detail('phone') : productKeys.list()
    client.setQueryData(key, detail ? product : [product])
    mockFetch.mockResolvedValue(jsonResponse({ error: 'Unavailable' }, 503))
    setup(
      detail ? (
        <SingleProduct />
      ) : kind === 'categories' ? (
        <Category selectedCategories={[]} handleFilters={() => {}} />
      ) : (
        <Slider />
      ),
      detail
    )
    await act(async () => {
      await client.refetchQueries({ queryKey: key })
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      /could not refresh/i
    )
    const content = () =>
      detail
        ? screen.getByRole('button', { name: 'Buy Fixture Phone' })
        : kind === 'categories'
          ? screen.getByRole('checkbox', { name: 'phones' })
          : screen.getByAltText('Fixture Phone')
    expect(content()).toBeVisible()
    mockFetch.mockResolvedValue(jsonResponse(detail ? product : [product]))
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    await waitFor(() =>
      expect(screen.queryByText(/could not refresh/i)).not.toBeInTheDocument()
    )
    expect(content()).toBeVisible()
  }
)

it.each(['categories', 'featured products'] as const)(
  'distinguishes an empty successful %s response from failure',
  async kind => {
    mockFetch.mockResolvedValue(jsonResponse([]))
    setup(
      kind === 'categories' ? (
        <Category selectedCategories={[]} handleFilters={() => {}} />
      ) : (
        <Slider />
      )
    )
    expect(
      await screen.findByText(
        kind === 'categories'
          ? 'No categories available.'
          : 'Featured products will appear here soon.'
      )
    ).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /try again/i })
    ).not.toBeInTheDocument()
  }
)
