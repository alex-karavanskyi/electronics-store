import { act, cleanup, renderHook } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import {
  AccessContext,
  type Access,
  unavailableAccess,
} from '@/shared/auth/useAccess'
import { useProductMutation } from '@/shared/hooks/useProductMutation'
import { createQueryClient } from '@/shared/lib/queryClient'
import { productKeys } from '@/shared/hooks/useProducts'
import cart, { hydrateCart } from '@/redux/features/cartSlice'
import { persistCartMiddleware } from '@/redux/middleware/persistCartMiddleware'
import { mockFetch, jsonResponse } from '../support/fetch'

const original = {
  id: 'one',
  name: 'Phone',
  price: 10,
  description: '',
  category: '',
  image: '',
  images: [],
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
function setup() {
  let access: Access = {
    status: 'authenticated',
    userId: 'A',
    isAdmin: true,
    getToken: async () => 'token-A',
  }
  const client = createQueryClient()
  clients.push(client)
  const store = configureStore({
    reducer: { cart },
    middleware: get => get().concat(persistCartMiddleware),
  })
  store.dispatch(hydrateCart([{ product: original, quantity: 3 }]))
  client.setQueryData(productKeys.detail('one'), original)
  client.setQueryData(productKeys.list(), [original])
  client.setQueryData(['favorites', 'user', 'A'], { ids: ['one'], revision: 1 })
  const hook = renderHook(() => useProductMutation(), {
    wrapper: ({ children }) => (
      <AccessContext.Provider value={access}>
        <Provider store={store}>
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        </Provider>
      </AccessContext.Provider>
    ),
  })
  return {
    ...hook,
    client,
    store,
    access: (next: Access) => {
      access = next
      hook.rerender()
    },
  }
}
it('updates detail and persisted cart without changing quantity; invalidates all catalog variants', async () => {
  const view = setup()
  mockFetch.mockResolvedValue(
    jsonResponse({ ...original, name: 'Updated', price: 20 })
  )
  await act(async () => {
    await view.result.current.mutateAsync({
      kind: 'update',
      id: 'one',
      input: { price: 20 },
    })
  })
  expect(view.client.getQueryData(productKeys.detail('one'))).toMatchObject({
    name: 'Updated',
    price: 20,
  })
  expect(view.client.getQueryState(productKeys.list())?.isInvalidated).toBe(
    true
  )
  expect(view.store.getState().cart.items[0]).toMatchObject({
    quantity: 3,
    product: { name: 'Updated', price: 20 },
  })
  expect(
    JSON.parse(localStorage.getItem('volt_cart')!).items[0].product.price
  ).toBe(20)
})
it('removes deleted detail and cart data and refreshes server favorites', async () => {
  const view = setup()
  mockFetch.mockResolvedValue({ ok: true, status: 204 } as Response)
  await act(async () => {
    await view.result.current.mutateAsync({ kind: 'delete', id: 'one' })
  })
  expect(view.client.getQueryData(productKeys.detail('one'))).toBeNull()
  expect(view.store.getState().cart.items).toEqual([])
  expect(
    view.client.getQueryState(['favorites', 'user', 'A'])?.isInvalidated
  ).toBe(true)
})
it('keeps the cart and detail intact on a rejected write', async () => {
  const view = setup()
  mockFetch.mockResolvedValue(
    jsonResponse({ error: 'Administrator access required' }, 403)
  )
  await act(async () => {
    await expect(
      view.result.current.mutateAsync({ kind: 'delete', id: 'one' })
    ).rejects.toMatchObject({ status: 403 })
  })
  expect(view.store.getState().cart.items).toHaveLength(1)
  expect(view.client.getQueryData(productKeys.detail('one'))).toEqual(original)
})
it('does not send a write if the account changes while obtaining its token', async () => {
  const view = setup()
  let resolve!: (value: string) => void
  view.access({
    status: 'authenticated',
    userId: 'A',
    isAdmin: true,
    getToken: () =>
      new Promise(done => {
        resolve = done
      }),
  })
  let result!: Promise<unknown>
  await act(async () => {
    result = view.result.current
      .mutateAsync({ kind: 'delete', id: 'one' })
      .catch(error => error)
  })
  view.access(unavailableAccess)
  await act(async () => {
    resolve('token-A')
    await result
  })
  expect(mockFetch).not.toHaveBeenCalled()
  expect(view.store.getState().cart.items).toHaveLength(1)
})
it('allows ordinary users and invalidates their personal list after a write', async () => {
  const view = setup()
  view.access({
    status: 'authenticated',
    userId: 'A',
    isAdmin: false,
    getToken: async () => 'token-A',
  })
  view.client.setQueryData(['my-products', 'A'], [])
  mockFetch.mockResolvedValue(jsonResponse(original, 201))
  await act(async () => {
    await view.result.current.mutateAsync({
      kind: 'create',
      input: {
        name: 'Phone',
        price: 10,
        description: '',
        category: '',
        images: [],
      },
    })
  })
  expect(view.client.getQueryState(['my-products', 'A'])?.isInvalidated).toBe(
    true
  )
})
it('refreshes the originating personal cache when the form unmounts before a successful write', async () => {
  const view = setup()
  view.client.setQueryData(['my-products', 'A'], [original])
  let finish!: (response: Response) => void
  mockFetch.mockImplementation(
    () =>
      new Promise(resolve => {
        finish = resolve
      })
  )
  let pending!: Promise<unknown>
  await act(async () => {
    pending = view.result.current.mutateAsync({ kind: 'delete', id: 'one' })
  })
  view.unmount()
  await act(async () => {
    finish({ ok: true, status: 204 } as Response)
    await pending
  })
  expect(view.client.getQueryState(['my-products', 'A'])?.isInvalidated).toBe(
    true
  )
})
