import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import {
  AccessContext,
  type Access,
  unavailableAccess,
} from '@/shared/auth/useAccess'
import { store } from '@/redux/store'
import { clearCart, closeCart } from '@/redux/features/cartSlice'
import { setGridView } from '@/redux/features/catalogViewSlice'
import { mockFetch, jsonResponse } from '../support/fetch'
import { randomUUID } from 'node:crypto'
import { installStorageLocks } from '../support/locks'

jest.mock('@/components/home/slider/Slider', () => () => null)
jest.mock('@/components/chat/Chat', () => () => null)
jest.mock('@clerk/react', () => ({ UserButton: () => null }))
const real = {
  id: 'real_phone',
  name: 'Real Phone',
  price: 40,
  category: 'phones',
  description: '',
  images: [],
  image: '',
}
beforeEach(() => {
  Element.prototype.scrollIntoView = jest.fn()
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
  localStorage.clear()
  sessionStorage.clear()
  store.dispatch(clearCart())
  store.dispatch(closeCart())
  store.dispatch(setGridView())
  mockFetch.mockReset().mockImplementation(async raw => {
    if (String(raw).includes('/api/me/favorites'))
      return jsonResponse({ ids: [], revision: 0 })
    if (String(raw).includes('/catalog'))
      return jsonResponse({
        items: [real],
        total: 1,
        page: 1,
        pageSize: 6,
        min_price: 40,
        max_price: 40,
      })
    return jsonResponse(String(raw) === '/api/products' ? [real] : real)
  })
})
afterEach(() => {
  cleanup()
  jest.restoreAllMocks()
})
function setup(access: Access = unavailableAccess, url = '/') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AccessContext.Provider value={access}>
        <App />
      </AccessContext.Provider>
    </MemoryRouter>
  )
}
it('merges a guest favorite, applies Admin edits to the cart, and isolates the next account', async () => {
  installStorageLocks()
  Object.defineProperty(crypto, 'randomUUID', {
    value: randomUUID,
    configurable: true,
  })
  let current = { ...real }
  const accountIds: Record<string, string[]> = { user_a: [], user_b: [] }
  mockFetch.mockImplementation(async (raw, request) => {
    const path = String(raw)
    if (path === '/api/me/products') return jsonResponse([])
    const userId =
      new Headers(request?.headers)
        .get('Authorization')
        ?.replace('Bearer ', '') ?? ''
    if (path.startsWith('/api/me/favorites')) {
      if (path.endsWith('/merge')) {
        accountIds[userId] = [
          ...new Set([
            ...accountIds[userId],
            ...JSON.parse(String(request?.body)).ids,
          ]),
        ]
      }
      return jsonResponse({ ids: accountIds[userId] ?? [], revision: 1 })
    }
    if (request?.method === 'PATCH') {
      expect(userId).toBe('user_a')
      current = { ...current, ...JSON.parse(String(request.body)) }
      return jsonResponse(current)
    }
    if (path.includes('/catalog'))
      return jsonResponse({
        items: [current],
        total: 1,
        page: 1,
        pageSize: 6,
        min_price: current.price,
        max_price: current.price,
      })
    return jsonResponse(path === '/api/products' ? [current] : current)
  })
  const view = setup()
  const switchAccount = (userId: string, isAdmin = false) =>
    view.rerender(
      <MemoryRouter>
        <AccessContext.Provider
          value={{
            status: 'authenticated',
            userId,
            isAdmin,
            getToken: async () => userId,
          }}
        >
          <App />
        </AccessContext.Provider>
      </MemoryRouter>
    )
  fireEvent.click(
    await screen.findByRole('button', { name: 'Favorite Real Phone' })
  )
  await waitFor(() =>
    expect(JSON.parse(localStorage.getItem('volt_favorites')!).ids).toEqual([
      'real_phone',
    ])
  )
  switchAccount('user_a')
  await waitFor(() => expect(accountIds.user_a).toEqual(['real_phone']))
  expect(screen.getByRole('button', { name: 'Add Product' })).toBeVisible()
  fireEvent.click(screen.getByRole('link', { name: 'View Real Phone' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Buy Real Phone' }))
  switchAccount('user_a', true)
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Product' }))
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '75' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() =>
    expect(store.getState().cart.items[0].product.price).toBe(75)
  )
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
  switchAccount('user_b')
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Favorite Real Phone' })
    ).toHaveAttribute('aria-pressed', 'false')
  )
  expect(
    screen.queryByRole('button', { name: 'Edit Product' })
  ).not.toBeInTheDocument()
  expect(accountIds.user_a).toEqual(['real_phone'])
  expect(accountIds.user_b).toEqual([])
  expect(JSON.parse(localStorage.getItem('volt_favorites')!).ids).toEqual([])
})
