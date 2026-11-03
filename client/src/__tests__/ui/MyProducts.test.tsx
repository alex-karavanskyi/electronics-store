import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import MyProducts from '@/components/product/MyProducts'
import ProductManagement from '@/components/product/ProductManagement'
import ProductAccountSync from '@/shared/auth/ProductAccountSync'
import {
  AccessContext,
  type Access,
  unavailableAccess,
} from '@/shared/auth/useAccess'
import { createQueryClient } from '@/shared/lib/queryClient'
import { useProducts } from '@/shared/hooks/useProducts'
import cart from '@/redux/features/cartSlice'
import { mockFetch, jsonResponse } from '../support/fetch'

jest.mock('@clerk/react', () => ({
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
}))
const phone = {
  id: 'one',
  name: 'My phone',
  price: 10,
  description: '',
  category: '',
  image: '',
  images: [],
}
const account = (userId: string): Access => ({
  status: 'authenticated',
  userId,
  isAdmin: false,
  getToken: async () => userId,
})
const clients: ReturnType<typeof createQueryClient>[] = []
beforeEach(() => mockFetch.mockReset())
afterEach(() => {
  cleanup()
  clients.splice(0).forEach(client => client.clear())
})
function PublicList() {
  const query = useProducts()
  return (
    <output aria-label="Public products">
      {query.data?.map(item => item.name).join(', ')}
    </output>
  )
}
function Location() {
  return <output aria-label="URL">{useLocation().pathname}</output>
}
function setup(initial = account('A'), detail = false) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, staleTime: 60000 } })
  clients.push(client)
  const store = configureStore({ reducer: { cart } })
  const tree = (access: Access) => (
    <MemoryRouter initialEntries={['/my-products']}>
      <AccessContext.Provider value={access}>
        <Provider store={store}>
          <QueryClientProvider client={client}>
            <ProductAccountSync />
            {detail ? <ProductManagement product={phone} /> : <MyProducts />}
            <PublicList />
            <Location />
          </QueryClientProvider>
        </Provider>
      </AccessContext.Provider>
    </MemoryRouter>
  )
  const view = render(tree(initial))
  return {
    ...view,
    client,
    switchAccount: (access: Access) => view.rerender(tree(access)),
  }
}
it.each(['guest', 'loading', 'unavailable'] as const)(
  'does not load private data for %s',
  async status => {
    mockFetch.mockResolvedValue(jsonResponse([]))
    setup({ ...unavailableAccess, status })
    expect(
      screen.queryByRole('button', { name: 'Add Product' })
    ).not.toBeInTheDocument()
    if (status === 'guest')
      expect(
        screen.getByRole('button', { name: 'Sign in or create account' })
      ).toBeVisible()
    else
      expect(
        within(screen.getByRole('region', { name: 'My products' })).getByRole(
          'status'
        )
      ).toHaveTextContent(
        status === 'loading' ? /loading account/i : /unavailable/i
      )
    await waitFor(() => expect(mockFetch).toHaveBeenCalled())
    expect(
      mockFetch.mock.calls.some(([url]) => String(url).includes('/me/products'))
    ).toBe(false)
  }
)
it('creates, edits and deletes own products, refreshes both lists and stays on the personal page', async () => {
  let items: (typeof phone)[] = []
  mockFetch.mockImplementation(async (_url, request) => {
    if (request?.method === 'POST') {
      items = [{ ...phone, ...JSON.parse(String(request.body)) }]
      return jsonResponse(items[0], 201)
    }
    if (request?.method === 'PATCH') {
      items = [{ ...items[0], ...JSON.parse(String(request.body)) }]
      return jsonResponse(items[0])
    }
    if (request?.method === 'DELETE') {
      items = []
      return { ok: true, status: 204 } as Response
    }
    return jsonResponse(items)
  })
  setup()
  expect(await screen.findByText(/you haven't published/i)).toBeVisible()
  const user = userEvent.setup()
  const add = screen.getByRole('button', { name: 'Add Product' })
  await user.click(add)
  expect(screen.getByLabelText('Name')).toHaveFocus()
  await user.type(screen.getByLabelText('Name'), 'My phone')
  await user.type(screen.getByLabelText('Price'), '10')
  await user.click(screen.getByRole('button', { name: 'Create product' }))
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
  expect(add).toHaveFocus()
  expect(await screen.findByRole('heading', { name: 'My phone' })).toBeVisible()
  await waitFor(() =>
    expect(screen.getByLabelText('Public products')).toHaveTextContent(
      'My phone'
    )
  )
  await user.click(screen.getByRole('button', { name: 'Edit Product' }))
  await user.clear(screen.getByLabelText('Name'))
  await user.type(screen.getByLabelText('Name'), 'Updated phone')
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(
    await screen.findByRole('heading', { name: 'Updated phone' })
  ).toBeVisible()
  await waitFor(() =>
    expect(screen.getByLabelText('Public products')).toHaveTextContent(
      'Updated phone'
    )
  )
  await user.click(screen.getByRole('button', { name: 'Delete Product' }))
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.getByRole('heading', { name: 'Updated phone' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Delete Product' }))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Delete permanently',
    })
  )
  expect(await screen.findByText(/you haven't published/i)).toBeVisible()
  expect(screen.getByLabelText('URL')).toHaveTextContent('/my-products')
  expect(screen.getByLabelText('Your products')).toHaveFocus()
  await waitFor(() =>
    expect(screen.getByLabelText('Public products')).toBeEmptyDOMElement()
  )
})
it('shows a retry after private load failure and never grants ownership on a failed request', async () => {
  mockFetch.mockImplementation(async url =>
    String(url).includes('/me/products')
      ? jsonResponse({ error: 'Unavailable' }, 503)
      : jsonResponse([])
  )
  setup()
  expect(await screen.findByRole('alert')).toHaveTextContent(/unable to load/i)
  expect(
    screen.queryByRole('button', { name: 'Edit Product' })
  ).not.toBeInTheDocument()
  mockFetch.mockResolvedValue(jsonResponse([phone]))
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('heading', { name: 'My phone' })).toBeVisible()
})
it.each([{ owned: [] }, { owned: [{ ...phone, id: 'other' }] }])(
  'hides detail controls for foreign and legacy products',
  async ({ owned }) => {
    mockFetch.mockResolvedValue(jsonResponse(owned))
    const view = setup(account('A'), true)
    await waitFor(() =>
      expect(view.client.getQueryData(['my-products', 'A'])).toEqual(owned)
    )
    expect(
      screen.queryByRole('button', { name: 'Edit Product' })
    ).not.toBeInTheDocument()
  }
)
it('cancels and removes A private reads on account switch and ignores a late response', async () => {
  let finish!: (response: Response) => void
  let signal: AbortSignal | undefined
  mockFetch.mockImplementation(async (url, request) => {
    if (
      String(url).includes('/me/products') &&
      new Headers(request?.headers).get('Authorization') === 'Bearer A'
    ) {
      signal = request?.signal ?? undefined
      return new Promise(resolve => {
        finish = resolve
      })
    }
    return jsonResponse([])
  })
  const view = setup()
  await waitFor(() => expect(finish).toBeDefined())
  view.switchAccount(account('B'))
  expect(await screen.findByText(/you haven't published/i)).toBeVisible()
  expect(signal?.aborted).toBe(true)
  await act(async () => {
    finish(jsonResponse([phone]))
  })
  expect(view.client.getQueryData(['my-products', 'A'])).toBeUndefined()
  expect(
    screen.queryByRole('heading', { name: 'My phone' })
  ).not.toBeInTheDocument()
  view.switchAccount({ ...unavailableAccess, status: 'guest' })
  expect(view.client.getQueryData(['my-products', 'B'])).toBeUndefined()
})
it('closes A draft on switch and a late save refreshes only public data', async () => {
  let finish!: (response: Response) => void
  mockFetch.mockImplementation(async (_url, request) =>
    request?.method === 'POST'
      ? new Promise(resolve => {
          finish = resolve
        })
      : jsonResponse([])
  )
  const view = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Add Product' }))
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'A private draft' },
  })
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '10' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create product' }))
  await waitFor(() => expect(finish).toBeDefined())
  view.switchAccount(account('B'))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(await screen.findByText(/you haven't published/i)).toBeVisible()
  const invalidate = jest.spyOn(view.client, 'invalidateQueries')
  await act(async () => {
    finish(jsonResponse(phone, 201))
  })
  await waitFor(() =>
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['products'] })
  )
  expect(invalidate).not.toHaveBeenCalledWith(
    expect.objectContaining({ queryKey: ['my-products', 'B'] })
  )
  expect(view.client.getQueryData(['my-products', 'A'])).toBeUndefined()
  expect(view.client.getQueryData(['my-products', 'B'])).toEqual([])
  expect(screen.queryByText(/product created/i)).not.toBeInTheDocument()
})
it('does not send a private read after changing accounts while obtaining a token', async () => {
  let token!: (value: string) => void
  mockFetch.mockResolvedValue(jsonResponse([]))
  const view = setup({
    ...account('A'),
    getToken: () =>
      new Promise(resolve => {
        token = resolve
      }),
  })
  await waitFor(() => expect(token).toBeDefined())
  view.switchAccount(account('B'))
  await act(async () => {
    token('A')
  })
  expect(await screen.findByText(/you haven't published/i)).toBeVisible()
  expect(
    mockFetch.mock.calls.some(
      ([, request]) =>
        new Headers(request?.headers).get('Authorization') === 'Bearer A'
    )
  ).toBe(false)
})
it('permits owner detail controls only after successful loading and closes the draft on logout', async () => {
  let finish!: (response: Response) => void
  mockFetch.mockImplementation(async url =>
    String(url).includes('/me/products')
      ? new Promise(resolve => {
          finish = resolve
        })
      : jsonResponse([])
  )
  const view = setup(account('A'), true)
  expect(
    screen.queryByRole('button', { name: 'Edit Product' })
  ).not.toBeInTheDocument()
  await waitFor(() => expect(finish).toBeDefined())
  await act(async () => {
    finish(jsonResponse([phone]))
  })
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Product' }))
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'Unsaved draft' },
  })
  view.switchAccount({ ...unavailableAccess, status: 'guest' })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(view.client.getQueryData(['my-products', 'A'])).toBeUndefined()
})
it('does not offer owner controls when the personal request fails', async () => {
  mockFetch.mockImplementation(async url =>
    String(url).includes('/me/products')
      ? jsonResponse({ error: 'Unavailable' }, 503)
      : jsonResponse([])
  )
  const view = setup(account('A'), true)
  await waitFor(() =>
    expect(view.client.getQueryState(['my-products', 'A'])?.status).toBe(
      'error'
    )
  )
  expect(
    screen.queryByRole('button', { name: 'Edit Product' })
  ).not.toBeInTheDocument()
})
it('keeps a personal row and confirmation visible when deletion is rejected', async () => {
  mockFetch.mockImplementation(async (_url, request) =>
    request?.method === 'DELETE'
      ? jsonResponse({ error: 'Forbidden' }, 403)
      : jsonResponse([phone])
  )
  setup()
  fireEvent.click(await screen.findByRole('button', { name: 'Delete Product' }))
  fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    /only change your own products/i
  )
  expect(screen.getByRole('heading', { name: 'My phone' })).toBeVisible()
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(screen.getByLabelText('URL')).toHaveTextContent('/my-products')
})
it('returns focus to the list after deleting one of several rows, and to the opener after cancel', async () => {
  let items = [phone, { ...phone, id: 'two', name: 'Second phone' }]
  mockFetch.mockImplementation(async (_url, request) => {
    if (request?.method === 'DELETE') {
      items = items.slice(1)
      return { ok: true, status: 204 } as Response
    }
    return jsonResponse(items)
  })
  setup()
  await screen.findByRole('heading', { name: 'My phone' })
  const opener = screen.getAllByRole('button', { name: 'Delete Product' })[0]
  opener.focus()
  fireEvent.click(opener)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(opener).toHaveFocus()
  fireEvent.click(opener)
  fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
  await waitFor(() =>
    expect(
      screen.queryByRole('heading', { name: 'My phone' })
    ).not.toBeInTheDocument()
  )
  expect(screen.getByRole('heading', { name: 'Second phone' })).toBeVisible()
  expect(screen.getByLabelText('Your products')).toHaveFocus()
})
