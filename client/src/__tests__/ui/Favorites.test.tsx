import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
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

import Favorites from '@/components/favorites/Favorites'
import cart from '@/redux/features/cartSlice'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/shared/lib/queryClient'
import { productKeys } from '@/shared/hooks/useProducts'
import { mockFetch, jsonResponse } from '../support/fetch'

const products = ['Phone', 'Laptop', 'Tablet'].map((name, index) => ({
  id: String(index),
  name,
  price: 100,
  description: '',
  category: 'electronics',
  image: '',
  images: [],
}))

const clients: ReturnType<typeof createQueryClient>[] = []
beforeEach(() => {
  localStorage.clear()
  mockFetch.mockReset()
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach(client => client.clear())
  jest.restoreAllMocks()
})

function setup(ids = ['0', '1', '2'], cached = products) {
  const store = configureStore({ reducer: { cart } })
  const client = createQueryClient()
  clients.push(client)
  client.setDefaultOptions({ queries: { retry: false, staleTime: 60_000 } })
  localStorage.setItem('volt_favorites', JSON.stringify({ version: 1, ids }))
  cached.forEach(product =>
    client.setQueryData(productKeys.detail(product.id), product)
  )
  render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <Favorites />
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>
  )
  return client
}

function displayedOrder() {
  return screen
    .getAllByRole('listitem')
    .map(item => within(item).getByRole('heading').textContent)
}

it('moves the selected favorite with the keyboard and updates the boundary buttons', async () => {
  const user = userEvent.setup()
  setup()
  expect(screen.getByRole('button', { name: 'Move Phone up' })).toBeDisabled()
  expect(
    screen.getByRole('button', { name: 'Move Tablet down' })
  ).toBeDisabled()

  screen.getByRole('button', { name: 'Move Phone down' }).focus()
  await user.keyboard('{Enter}')
  expect(displayedOrder()).toEqual(['Laptop', 'Phone', 'Tablet'])
  expect(JSON.parse(localStorage.getItem('volt_favorites')!).ids).toEqual([
    '1',
    '0',
    '2',
  ])
  expect(screen.getByRole('button', { name: 'Move Laptop up' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Move Phone up' })).toBeEnabled()

  screen.getByRole('button', { name: 'Move Phone up' }).focus()
  await user.keyboard(' ')
  expect(displayedOrder()).toEqual(['Phone', 'Laptop', 'Tablet'])
  expect(screen.getByRole('button', { name: 'Move Phone up' })).toBeDisabled()

  const laptopRow = screen
    .getByRole('heading', { name: 'Laptop' })
    .closest('li')!
  fireEvent.click(within(laptopRow).getByRole('button', { name: 'Delete' }))
  expect(JSON.parse(localStorage.getItem('volt_favorites')!).ids).toEqual([
    '0',
    '2',
  ])
})

it('loads current details for stored IDs, including products outside the catalog', async () => {
  const product = {
    ...products[0],
    id: 'outside / catalog',
    name: 'Fresh name',
    price: 250,
  }
  mockFetch.mockResolvedValue(jsonResponse(product))
  setup([product.id], [])
  expect(screen.getByRole('status')).toHaveTextContent('Loading favorite')
  expect(
    await screen.findByRole('heading', { name: 'Fresh name' })
  ).toBeVisible()
  expect(screen.getByText('$250.00')).toBeVisible()
  expect(mockFetch.mock.calls[0][0]).toBe(
    '/api/products/outside%20%2F%20catalog'
  )
  expect(JSON.parse(localStorage.getItem('volt_favorites')!)).toEqual({
    version: 1,
    ids: [product.id],
  })
})

it('keeps an unavailable favorite through a failed read and supports retry', async () => {
  mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Unavailable' }, 503))
  setup(['0'], [])
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Unable to load this favorite'
  )
  expect(JSON.parse(localStorage.getItem('volt_favorites')!).ids).toEqual(['0'])
  mockFetch.mockResolvedValueOnce(jsonResponse(products[0]))
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('heading', { name: 'Phone' })).toBeVisible()
})

it('lets the user remove a missing product and does not leave a ghost wishlist row', async () => {
  mockFetch.mockResolvedValue(jsonResponse({ error: 'Missing' }, 404))
  setup(['0'], [])
  expect(
    await screen.findByText('This product is no longer available.')
  ).toBeVisible()
  fireEvent.click(
    screen.getByRole('button', { name: 'Remove unavailable favorite' })
  )
  expect(await screen.findByText('Your wishlist is empty')).toBeVisible()
  expect(JSON.parse(localStorage.getItem('volt_favorites')!).ids).toEqual([])
})

it('does not restore a removed favorite when its pending detail response arrives', async () => {
  let resolve!: (response: Response) => void
  mockFetch.mockImplementation(
    () =>
      new Promise(done => {
        resolve = done
      })
  )
  setup(['0'], [])
  fireEvent.click(
    screen.getByRole('button', { name: 'Remove unavailable favorite' })
  )
  await act(async () => resolve(jsonResponse(products[0])))
  expect(await screen.findByText('Your wishlist is empty')).toBeVisible()
  expect(
    screen.queryByRole('heading', { name: 'Phone' })
  ).not.toBeInTheDocument()
})

it('keeps existing details on a refresh error and accepts a later update to all product fields', async () => {
  const client = setup(['0'], [products[0]])
  mockFetch.mockResolvedValueOnce(jsonResponse({ error: 'Unavailable' }, 503))
  await act(async () => {
    await client.invalidateQueries({ queryKey: productKeys.detail('0') })
  })
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Could not refresh'
  )
  expect(screen.getByRole('heading', { name: 'Phone' })).toBeVisible()
  mockFetch.mockResolvedValueOnce(
    jsonResponse({ ...products[0], name: 'New phone', price: 350 })
  )
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(
    await screen.findByRole('heading', { name: 'New phone' })
  ).toBeVisible()
  expect(screen.getByText('$350.00')).toBeVisible()
})

it('shows a persistence notice without losing a keyboard reorder if storage is full', async () => {
  setup()
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('full')
  })
  fireEvent.click(screen.getByRole('button', { name: 'Move Phone down' }))
  await waitFor(() =>
    expect(displayedOrder()).toEqual(['Laptop', 'Phone', 'Tablet'])
  )
  expect(screen.getByRole('status')).toHaveTextContent('could not be saved')
})

it('reorders from the focused handle with arrow keys and respects list boundaries', async () => {
  const user = userEvent.setup()
  setup()
  const handle = screen.getByRole('button', { name: 'Drag to reorder Phone' })
  handle.focus()
  await user.keyboard('{ArrowUp}')
  expect(displayedOrder()).toEqual(['Phone', 'Laptop', 'Tablet'])
  await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
  expect(displayedOrder()).toEqual(['Laptop', 'Tablet', 'Phone'])
  expect(handle).toHaveFocus()
  await user.keyboard('{ArrowUp}')
  expect(displayedOrder()).toEqual(['Laptop', 'Phone', 'Tablet'])
})
