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
import { MemoryRouter, useLocation } from 'react-router-dom'
import ProductManagement from '@/components/product/ProductManagement'
import {
  AccessContext,
  type Access,
  unavailableAccess,
} from '@/shared/auth/useAccess'
import { createQueryClient } from '@/shared/lib/queryClient'
import cart from '@/redux/features/cartSlice'
import { mockFetch, jsonResponse } from '../support/fetch'

const product = {
  id: 'one',
  name: 'Phone',
  price: 10,
  description: '',
  category: '',
  image: '/legacy.png',
  images: ['/legacy.png'],
}
const admin: Access = {
  status: 'authenticated',
  userId: 'A',
  isAdmin: true,
  getToken: async () => 'token',
}
const clients: ReturnType<typeof createQueryClient>[] = []
beforeEach(() => {
  mockFetch.mockReset()
  localStorage.clear()
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach(client => client.clear())
})
function setup(edit = false, access = admin) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false } })
  clients.push(client)
  const store = configureStore({ reducer: { cart } })
  function Location() {
    const location = useLocation()
    return (
      <output aria-label="Current URL">
        {location.pathname + location.search}
      </output>
    )
  }
  return render(
    <MemoryRouter
      initialEntries={[edit ? '/product/one' : '/?category=audio&page=2']}
    >
      <AccessContext.Provider value={access}>
        <Provider store={store}>
          <QueryClientProvider client={client}>
            <ProductManagement product={edit ? product : undefined} />
            <Location />
          </QueryClientProvider>
        </Provider>
      </AccessContext.Provider>
    </MemoryRouter>
  )
}
it.each([unavailableAccess, { ...admin, status: 'loading' as const }])(
  'does not expose product management without authentication',
  access => {
    setup(true, access)
    expect(
      screen.queryByRole('button', { name: /product/i })
    ).not.toBeInTheDocument()
  }
)
it('offers creation to an ordinary registered user', () => {
  setup(false, { ...admin, isAdmin: false })
  expect(screen.getByRole('button', { name: 'Add Product' })).toBeVisible()
})
it('creates a free product, preserves catalog criteria and provides a link to the result', async () => {
  mockFetch.mockResolvedValue(
    jsonResponse(
      {
        ...product,
        id: 'prod_new',
        name: 'New phone',
        price: 0,
        image: '',
        images: [],
      },
      201
    )
  )
  setup()
  const opener = screen.getByRole('button', { name: 'Add Product' })
  opener.focus()
  fireEvent.click(opener)
  const dialog = screen.getByRole('dialog', { name: 'Add Product' })
  fireEvent.change(within(dialog).getByLabelText('Name'), {
    target: { value: 'New phone' },
  })
  fireEvent.change(within(dialog).getByLabelText('Price'), {
    target: { value: '0' },
  })
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Create product' })
  )
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
  expect(screen.getByRole('link', { name: 'View New phone' })).toHaveAttribute(
    'href',
    '/product/prod_new'
  )
  expect(screen.getByLabelText('Current URL')).toHaveTextContent(
    '/?category=audio&page=2'
  )
  expect(JSON.parse(mockFetch.mock.calls[0][1]!.body as string)).toEqual({
    name: 'New phone',
    price: 0,
    description: '',
    category: '',
    images: [],
  })
  expect(opener).toHaveFocus()
})
it('keeps the draft on server failure and submits only changed fields including an empty gallery', async () => {
  mockFetch.mockResolvedValueOnce(
    jsonResponse({ error: 'Product service temporarily unavailable' }, 503)
  )
  setup(true)
  fireEvent.click(screen.getByRole('button', { name: 'Edit Product' }))
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '25' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    /temporarily unavailable/i
  )
  expect(screen.getByLabelText('Price')).toHaveValue(25)
  expect(JSON.parse(mockFetch.mock.calls[0][1]!.body as string)).toEqual({
    price: 25,
  })
  fireEvent.click(screen.getByRole('button', { name: 'Remove image 1' }))
  mockFetch.mockResolvedValue(
    jsonResponse({ ...product, price: 25, images: [], image: '' })
  )
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
  expect(JSON.parse(mockFetch.mock.calls[1][1]!.body as string)).toEqual({
    price: 25,
    images: [],
  })
})
it('uploads a local image and sends it with the product', async () => {
  mockFetch.mockResolvedValue(jsonResponse(product, 201))
  setup()
  fireEvent.click(screen.getByRole('button', { name: 'Add Product' }))
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'Phone' },
  })
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '10' } })
  const file = new File(
    [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
    'phone.png',
    { type: 'image/png' }
  )
  fireEvent.change(screen.getByLabelText('Images'), {
    target: { files: [file] },
  })
  expect(await screen.findByAltText('Product image 1')).toHaveAttribute(
    'src',
    'data:image/png;base64,iVBORw0KGgo='
  )
  fireEvent.click(screen.getByRole('button', { name: 'Create product' }))
  await waitFor(() => expect(mockFetch).toHaveBeenCalled())
  expect(JSON.parse(mockFetch.mock.calls[0][1]!.body as string).images).toEqual(
    ['data:image/png;base64,iVBORw0KGgo=']
  )
})
it('validates fields before sending and closes an unchanged edit without a PATCH', async () => {
  setup(true)
  fireEvent.click(screen.getByRole('button', { name: 'Edit Product' }))
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByText('Enter a price')).toBeVisible()
  expect(mockFetch).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '10' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
  expect(mockFetch).not.toHaveBeenCalled()
})
it('requires confirmation and prevents repeat deletion or closing during a pending request', async () => {
  let finish!: (response: Response) => void
  mockFetch.mockImplementation(
    () =>
      new Promise(resolve => {
        finish = resolve
      })
  )
  setup(true)
  fireEvent.click(screen.getByRole('button', { name: 'Delete Product' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(mockFetch).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Delete Product' }))
  fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1))
  expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.getByRole('dialog')).toBeVisible()
  finish({ ok: true, status: 204 } as Response)
  await waitFor(() =>
    expect(screen.getByLabelText('Current URL')).toHaveTextContent(/^\/$/)
  )
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
