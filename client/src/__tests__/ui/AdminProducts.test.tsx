import {
  act,
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
import AdminProducts from '@/components/product/AdminProducts'
import ProductManagement from '@/components/product/ProductManagement'
import ProductAccountSync from '@/shared/auth/ProductAccountSync'
import {
  AccessContext,
  type Access,
  unavailableAccess,
} from '@/shared/auth/useAccess'
import { createQueryClient } from '@/shared/lib/queryClient'
import { productKeys } from '@/shared/hooks/useProducts'
import cart from '@/redux/features/cartSlice'
import { mockFetch, jsonResponse } from '../support/fetch'

jest.mock('@clerk/react', () => ({
  SignInButton: ({ children }: { children: React.ReactNode }) => children,
}))
const phone = {
  id: 'published-one',
  name: 'Other phone',
  price: 10,
  description: '',
  category: 'phones',
  image: '',
  images: [],
}
const rows = [
  {
    product: phone,
    ownerId: 'author-one',
    createdAt: '2026-10-31T10:00:00.000Z',
  },
  {
    product: { ...phone, id: 'legacy', name: 'Original phone' },
    ownerId: null,
    createdAt: null,
  },
]
const admin: Access = {
  status: 'authenticated',
  userId: 'admin-A',
  isAdmin: true,
  getToken: async () => 'admin-A',
}
const clients: ReturnType<typeof createQueryClient>[] = []
beforeEach(() => mockFetch.mockReset())
afterEach(() => {
  cleanup()
  clients.splice(0).forEach(client => client.clear())
})
function Location() {
  return <output aria-label="URL">{useLocation().pathname}</output>
}
function setup(initial = admin, author = false) {
  const client = createQueryClient()
  client.setDefaultOptions({ queries: { retry: false, staleTime: 60000 } })
  client.setQueryData(productKeys.detail(phone.id), phone)
  client.setQueryData(['my-products', initial.userId], [phone])
  clients.push(client)
  const store = configureStore({ reducer: { cart } })
  const tree = (access: Access) => (
    <MemoryRouter initialEntries={['/admin/products']}>
      <AccessContext.Provider value={access}>
        <Provider store={store}>
          <QueryClientProvider client={client}>
            <ProductAccountSync />
            {author ? <ProductManagement product={phone} /> : <AdminProducts />}
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
    switchAccess: (access: Access) => view.rerender(tree(access)),
  }
}
it.each([
  { ...unavailableAccess, status: 'guest' as const },
  unavailableAccess,
  { ...admin, status: 'loading' as const },
  { ...admin, isAdmin: false },
])(
  'protects the direct page for $status and isAdmin=$isAdmin',
  async access => {
    setup(access)
    expect(
      screen.queryByLabelText('Search publications')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Delete Product' })
    ).not.toBeInTheDocument()
    if (access.status === 'guest')
      expect(
        screen.getByRole('button', { name: 'Sign in or create account' })
      ).toBeVisible()
    if (access.status === 'authenticated')
      expect(screen.getByRole('alert')).toHaveTextContent(
        /administrator access/i
      )
    await act(async () => {})
    expect(mockFetch).not.toHaveBeenCalled()
  }
)
it('shows notification status, retries failed messages and leaves legacy without a retry action', async () => {
  let status = 'failed'
  mockFetch.mockImplementation(async (_url, request) => {
    if (request?.method === 'POST') {
      status = 'sent'
      return jsonResponse({ status: 'sent' })
    }
    return jsonResponse([
      {
        ...rows[0],
        notification: {
          channel: 'telegram',
          status,
          attempts: 1,
          errorCode: status === 'failed' ? 'configuration' : null,
          nextAttemptAt: null,
          leaseUntil: null,
        },
      },
      rows[1],
    ])
  })
  setup()
  expect(await screen.findByText('Telegram: failed')).toBeVisible()
  expect(screen.getByText(/telegram settings are incomplete/i)).toBeVisible()
  expect(screen.getByText('Telegram: not requested')).toBeVisible()
  expect(
    screen.getAllByRole('button', { name: 'Retry notification' })
  ).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Retry notification' }))
  expect(await screen.findByText('Telegram: sent')).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Retry notification' })
  ).not.toBeInTheDocument()
})

it('keeps failed notifications visible after retry error and prevents sends after role loss during token retrieval', async () => {
  mockFetch.mockResolvedValue(
    jsonResponse([
      {
        ...rows[0],
        notification: {
          channel: 'telegram',
          status: 'failed',
          attempts: 4,
          errorCode: 'network',
          nextAttemptAt: null,
          leaseUntil: null,
        },
      },
    ])
  )
  let tokenReady!: (value: string) => void
  let waitForToken = false
  const view = setup({
    ...admin,
    getToken: () =>
      waitForToken
        ? new Promise(resolve => {
            tokenReady = resolve
          })
        : Promise.resolve('admin-A'),
  })
  await screen.findByText('Telegram: failed')
  mockFetch.mockImplementation(async (_url, request) =>
    request?.method === 'POST'
      ? jsonResponse({ error: 'Unavailable' }, 503)
      : jsonResponse([
          {
            ...rows[0],
            notification: {
              channel: 'telegram',
              status: 'failed',
              attempts: 4,
              errorCode: 'network',
              nextAttemptAt: null,
              leaseUntil: null,
            },
          },
        ])
  )
  fireEvent.click(screen.getByRole('button', { name: 'Retry notification' }))
  expect(await screen.findByText(/unable to retry notification/i)).toBeVisible()
  expect(screen.getByText('Telegram: failed')).toBeVisible()
  waitForToken = true
  const before = mockFetch.mock.calls.length
  fireEvent.click(screen.getByRole('button', { name: 'Retry notification' }))
  await waitFor(() => expect(tokenReady).toBeDefined())
  view.switchAccess({ ...admin, isAdmin: false })
  await act(async () => {
    tokenReady('admin-A')
  })
  expect(mockFetch).toHaveBeenCalledTimes(before)
  expect(screen.queryByText('Telegram: failed')).not.toBeInTheDocument()
})

it('shows owner/date/legacy and searches by name, product ID or owner', async () => {
  mockFetch.mockResolvedValue(jsonResponse(rows))
  setup()
  expect(
    await screen.findByRole('heading', { name: 'Other phone' })
  ).toBeVisible()
  expect(screen.getByText('author-one')).toBeVisible()
  expect(screen.getByText('Original catalog')).toBeVisible()
  expect(screen.getByText('Date unavailable')).toBeVisible()
  for (const term of ['OTHER PHONE', 'published-one', 'author-one']) {
    fireEvent.change(screen.getByLabelText('Search publications'), {
      target: { value: term },
    })
    expect(screen.getByRole('heading', { name: 'Other phone' })).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Original phone' })
    ).not.toBeInTheDocument()
  }
  fireEvent.change(screen.getByLabelText('Search publications'), {
    target: { value: 'missing' },
  })
  expect(screen.getByText(/no publications match/i)).toBeVisible()
})
it('edits a foreign publication and deletes it with confirmation, updates public detail and stays in the panel', async () => {
  let current = [rows[0]]
  mockFetch.mockImplementation(async (url, request) => {
    if (request?.method === 'PATCH') {
      current = [
        { ...current[0], product: { ...phone, name: 'Moderated phone' } },
      ]
      return jsonResponse(current[0].product)
    }
    if (request?.method === 'DELETE') {
      current = []
      return { ok: true, status: 204 } as Response
    }
    return jsonResponse(String(url).includes('/admin/products') ? current : [])
  })
  const view = setup()
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Product' }))
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'Moderated phone' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(
    await screen.findByRole('heading', { name: 'Moderated phone' })
  ).toBeVisible()
  expect(view.client.getQueryData(productKeys.detail(phone.id))).toMatchObject({
    name: 'Moderated phone',
  })
  const opener = screen.getByRole('button', { name: 'Delete Product' })
  opener.focus()
  fireEvent.click(opener)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(opener).toHaveFocus()
  expect(mockFetch.mock.calls.some(([, req]) => req?.method === 'DELETE')).toBe(
    false
  )
  fireEvent.click(opener)
  fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
  expect(await screen.findByText(/no publications yet/i)).toBeVisible()
  expect(view.client.getQueryData(productKeys.detail(phone.id))).toBeNull()
  expect(screen.getByLabelText('Publications')).toHaveFocus()
  expect(screen.getByLabelText('URL')).toHaveTextContent('/admin/products')
})
it('keeps rows and the confirmation after a rejected delete', async () => {
  mockFetch.mockImplementation(async (_url, request) =>
    request?.method === 'DELETE'
      ? jsonResponse({ error: 'Forbidden' }, 403)
      : jsonResponse([rows[0]])
  )
  setup()
  fireEvent.click(await screen.findByRole('button', { name: 'Delete Product' }))
  fireEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    /changes have not been saved/i
  )
  expect(screen.getByRole('heading', { name: 'Other phone' })).toBeVisible()
  expect(screen.getByRole('dialog')).toBeVisible()
})
it('offers retry after list failure without showing an empty success', async () => {
  mockFetch.mockResolvedValue(jsonResponse({ error: 'Unavailable' }, 503))
  setup()
  expect(await screen.findByRole('alert')).toHaveTextContent(/unable to load/i)
  expect(screen.queryByText(/no publications yet/i)).not.toBeInTheDocument()
  mockFetch.mockResolvedValue(jsonResponse([]))
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByText(/no publications yet/i)).toBeVisible()
})
it('closes drafts and removes the administrative cache on role loss, while preserving the personal cache', async () => {
  mockFetch.mockResolvedValue(jsonResponse(rows))
  const view = setup()
  fireEvent.click(
    (await screen.findAllByRole('button', { name: 'Edit Product' }))[0]
  )
  fireEvent.change(screen.getByLabelText('Name'), {
    target: { value: 'Secret draft' },
  })
  view.switchAccess({ ...admin, isAdmin: false })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.queryByText('author-one')).not.toBeInTheDocument()
  expect(
    view.client.getQueryData(['admin-products', admin.userId])
  ).toBeUndefined()
  expect(view.client.getQueryData(['my-products', admin.userId])).toEqual([
    phone,
  ])
})
it('aborts a pending administrative response on role loss and never restores private rows', async () => {
  let finish!: (response: Response) => void
  let signal: AbortSignal | undefined
  mockFetch.mockImplementation((_url, request) => {
    signal = request?.signal ?? undefined
    return new Promise(resolve => {
      finish = resolve
    })
  })
  const view = setup()
  await waitFor(() => expect(finish).toBeDefined())
  view.switchAccess({ ...admin, isAdmin: false })
  expect(signal?.aborted).toBe(true)
  await act(async () => {
    finish(jsonResponse(rows))
  })
  expect(
    view.client.getQueryData(['admin-products', admin.userId])
  ).toBeUndefined()
  expect(screen.queryByText('author-one')).not.toBeInTheDocument()
})
it('does not send a privileged request after role loss while obtaining its token', async () => {
  let finish!: (value: string) => void
  const view = setup({
    ...admin,
    getToken: () =>
      new Promise(resolve => {
        finish = resolve
      }),
  })
  await waitFor(() => expect(finish).toBeDefined())
  view.switchAccess({ ...admin, isAdmin: false })
  await act(async () => {
    finish('old-admin-token')
  })
  expect(mockFetch).not.toHaveBeenCalled()
})
it('late writes after Admin A switches to Admin B do not restore A metadata or modify B private cache', async () => {
  let finish!: (response: Response) => void
  mockFetch.mockImplementation(async (_url, request) =>
    request?.method === 'PATCH'
      ? new Promise(resolve => {
          finish = resolve
        })
      : jsonResponse(rows)
  )
  const view = setup()
  fireEvent.click(
    (await screen.findAllByRole('button', { name: 'Edit Product' }))[0]
  )
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '20' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(finish).toBeDefined())
  view.switchAccess({
    ...admin,
    userId: 'admin-B',
    getToken: async () => 'admin-B',
  })
  await screen.findByText('author-one')
  const invalidate = jest.spyOn(view.client, 'invalidateQueries')
  await act(async () => {
    finish(jsonResponse({ ...phone, price: 20 }))
  })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(
    view.client.getQueryData(['admin-products', 'admin-A'])
  ).toBeUndefined()
  expect(invalidate).not.toHaveBeenCalledWith(
    expect.objectContaining({ queryKey: ['admin-products', 'admin-B'] })
  )
})
it('an author with an already-open editor sees 404 after moderation removes the product', async () => {
  mockFetch.mockResolvedValue(jsonResponse({ error: 'Product not found' }, 404))
  setup({ ...admin, isAdmin: false }, true)
  fireEvent.click(screen.getByRole('button', { name: 'Edit Product' }))
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '20' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  expect(
    await within(screen.getByRole('dialog')).findByRole('alert')
  ).toHaveTextContent(/no longer available/i)
  expect(screen.getByLabelText('Price')).toHaveValue(20)
})

it('keeps historical jobs read-only without offering delivery to Telegram', async () => {
  mockFetch.mockResolvedValue(
    jsonResponse([
      {
        ...rows[0],
        notification: {
          channel: null,
          status: 'failed',
          attempts: 1,
          errorCode: 'configuration',
          nextAttemptAt: null,
          leaseUntil: null,
        },
      },
    ])
  )
  setup()
  expect(await screen.findByText('Previous notification: failed')).toBeVisible()
  expect(
    screen.getByText(
      'This notification predates Telegram. Retry is unavailable.'
    )
  ).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Retry notification' })
  ).not.toBeInTheDocument()
})
