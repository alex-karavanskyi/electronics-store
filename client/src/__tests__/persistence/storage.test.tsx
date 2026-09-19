import { StrictMode } from 'react'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { act, render } from '@testing-library/react'
import cart, {
  addToCart,
  clearCart,
  openCart,
} from '@/redux/features/cartSlice'
import filter, { setListView } from '@/redux/features/catalogViewSlice'
import { persistCartMiddleware } from '@/redux/middleware/persistCartMiddleware'
import { persistGridViewMiddleware } from '@/redux/middleware/persistGridViewMiddleware'
import CartHydrator from '@/shared/lib/CartHydrator'
import { loadGridViewFromStorage } from '@/shared/lib/filtersStorage'
const product = {
  id: 'one',
  name: 'Phone',
  price: 125,
  image: '',
  images: [],
  category: 'phones',
  description: '',
}
const item = { product, quantity: 2 }
const setup = () =>
  configureStore({
    reducer: { cart, catalogView: filter },
    middleware: get =>
      get().concat(persistCartMiddleware, persistGridViewMiddleware),
  })
const mount = (store: ReturnType<typeof setup>) =>
  render(
    <StrictMode>
      <Provider store={store}>
        <CartHydrator />
      </Provider>
    </StrictMode>
  )
beforeEach(() => localStorage.clear())
afterEach(() => jest.restoreAllMocks())
it('restores validated items once, persists edits and keeps UI flags out of storage', () => {
  localStorage.setItem(
    'volt_cart',
    JSON.stringify({ version: 1, items: [item] })
  )
  const store = setup()
  const view = mount(store)
  expect(store.getState().cart.items).toEqual([item])
  act(() => {
    store.dispatch(addToCart(product))
    store.dispatch(openCart())
  })
  expect(JSON.parse(localStorage.getItem('volt_cart')!)).toEqual({
    version: 1,
    items: [{ product, quantity: 3 }],
  })
  view.unmount()
  localStorage.setItem('volt_cart', JSON.stringify({ version: 1, items: [] }))
  mount(store)
  expect(store.getState().cart.items[0].quantity).toBe(3)
  act(() => {
    store.dispatch(clearCart())
  })
  expect(JSON.parse(localStorage.getItem('volt_cart')!).items).toEqual([])
})
it.each([
  '{',
  'null',
  '{"version":0,"items":[]}',
  '{"version":2,"items":[]}',
  JSON.stringify({ version: 1, items: [{ ...item, quantity: 1.5 }] }),
  JSON.stringify({
    version: 1,
    items: [{ ...item, product: { ...product, images: 42 } }],
  }),
  JSON.stringify({
    version: 1,
    items: [{ ...item, product: { ...product, price: -1 } }],
  }),
  JSON.stringify({ version: 1, items: [item, item] }),
])('falls back for invalid or outdated cart: %s', value => {
  localStorage.setItem('volt_cart', value)
  const store = setup()
  mount(store)
  expect(store.getState().cart).toMatchObject({ items: [], isHydrated: true })
})
it('continues startup and edits when every storage operation throws', () => {
  for (const method of ['getItem', 'setItem', 'removeItem'] as const)
    jest.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw new Error('blocked')
    })
  const store = setup()
  expect(() => mount(store)).not.toThrow()
  expect(store.getState().cart.isHydrated).toBe(true)
  expect(loadGridViewFromStorage()).toBe(true)
  expect(() => {
    store.dispatch(addToCart(product))
    store.dispatch(setListView())
  }).not.toThrow()
  expect(store.getState().cart.items).toHaveLength(1)
  expect(store.getState().catalogView.grid_view).toBe(false)
})
it.each([
  ['false', false],
  ['true', true],
  ['invalid', true],
  ['null', true],
])('validates grid preference %s', (stored, expected) => {
  localStorage.setItem('grid_view', stored)
  expect(loadGridViewFromStorage()).toBe(expected)
})
