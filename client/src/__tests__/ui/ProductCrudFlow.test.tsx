import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import CatalogSection from '@/components/home/CatalogSection'
import SingleProduct from '@/components/product/SingleProduct'
import { AccessContext, type Access } from '@/shared/auth/useAccess'
import { createQueryClient } from '@/shared/lib/queryClient'
import cart from '@/redux/features/cartSlice'
import catalogView from '@/redux/features/catalogViewSlice'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { mockFetch, jsonResponse } from '../support/fetch'

jest.mock('@/shared/hooks/useIsMobile')
const admin: Access = {
  status: 'authenticated',
  userId: 'admin',
  isAdmin: true,
  getToken: async () => 'token',
}
const phone = {
  id: 'one',
  name: 'Phone',
  price: 10,
  description: '',
  category: 'phones',
  images: [],
  image: '',
}
const clients: ReturnType<typeof createQueryClient>[] = []
beforeEach(() => {
  localStorage.clear()
  mockFetch.mockReset()
  jest.mocked(useIsMobile).mockReturnValue(false)
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach(client => client.clear())
})
function setup(url: string) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, staleTime: 60000 } })
  clients.push(client)
  const store = configureStore({ reducer: { cart, catalogView } })
  function Location() {
    const location = useLocation()
    return (
      <output aria-label="URL">{location.pathname + location.search}</output>
    )
  }
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AccessContext.Provider value={admin}>
        <Provider store={store}>
          <QueryClientProvider client={client}>
            <Routes>
              <Route path="/" element={<CatalogSection />} />
              <Route path="/product/:id" element={<SingleProduct />} />
            </Routes>
            <Location />
          </QueryClientProvider>
        </Provider>
      </AccessContext.Provider>
    </MemoryRouter>
  )
}
function respond(raw: RequestInfo | URL) {
  const url = String(raw)
  if (url.startsWith('/api/me/favorites'))
    return jsonResponse({ ids: [], revision: 0 })
  if (url.includes('/catalog'))
    return jsonResponse({
      items: [phone],
      total: 1,
      page: 1,
      pageSize: 6,
      min_price: 10,
      max_price: 10,
    })
  if (url === '/api/products') return jsonResponse([phone])
  return jsonResponse(phone)
}
it.each([false, true])(
  'offers creation above empty catalog for mobile=%s',
  async mobile => {
    jest.mocked(useIsMobile).mockReturnValue(mobile)
    mockFetch.mockImplementation(async raw =>
      String(raw).includes('/catalog')
        ? jsonResponse({
            items: [],
            total: 0,
            page: 1,
            pageSize: 6,
            min_price: 0,
            max_price: 0,
          })
        : jsonResponse([])
    )
    setup('/')
    expect(await screen.findByText(/no products matched/i)).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Add Product' }))
    expect(screen.getByRole('dialog', { name: 'Add Product' })).toBeVisible()
  }
)
it('normalizes the URL to the server-clamped page and keeps filters and unrelated parameters', async () => {
  mockFetch.mockImplementation(async raw => respond(raw))
  setup('/?category=phones&sort=name-z&page=3&campaign=sale')
  await waitFor(() =>
    expect(screen.getByLabelText('URL')).toHaveTextContent(
      '/?campaign=sale&category=phones&sort=name-z'
    )
  )
  expect(await screen.findByRole('link', { name: 'View Phone' })).toBeVisible()
})
it('edits the real detail view and deletes it back to the catalog', async () => {
  let current = phone
  let deleted = false
  mockFetch.mockImplementation(async (raw, request) => {
    if (request?.method === 'PATCH') {
      current = { ...current, name: 'Edited phone' }
      return jsonResponse(current)
    }
    if (request?.method === 'DELETE') {
      deleted = true
      return { ok: true, status: 204 } as Response
    }
    if (String(raw) === '/api/products/one')
      return deleted
        ? jsonResponse({ error: 'Product not found' }, 404)
        : jsonResponse(current)
    return respond(raw)
  })
  setup('/product/one')
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Product' }))
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'Edited phone' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
  expect(screen.getByRole('button', { name: 'Buy Edited phone' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: 'Delete Product' }))
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Delete permanently',
    })
  )
  await waitFor(() =>
    expect(screen.getByLabelText('URL')).toHaveTextContent(/^\/$/)
  )
  expect(
    screen.queryByRole('button', { name: 'Buy Edited phone' })
  ).not.toBeInTheDocument()
})
