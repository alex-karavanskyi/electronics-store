import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockFetch } from '../support/fetch'
import '../support/streams'

import SingleProduct from '@/components/product/SingleProduct'
import cart from '@/redux/features/cartSlice'
import favorite from '@/redux/features/favoriteSlice'
import { productKeys } from '@/shared/hooks/useProducts'

const product = {
  id: 'phone',
  name: 'Fixture Phone',
  price: 125,
  description: 'Phone description',
  category: 'phones',
  image: '/phone.png',
  images: ['/phone.png'],
}
let client: QueryClient

beforeEach(() => {
  mockFetch.mockReset()
  HTMLElement.prototype.scrollIntoView = jest.fn()
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  client.setQueryData(productKeys.detail(product.id), product)
})

afterEach(() => {
  cleanup()
  client.clear()
})

it.each(['button', 'Escape', 'overlay'] as const)(
  'closes the product chat via %s, aborts its request and restores focus',
  async method => {
    const user = userEvent.setup()
    const store = configureStore({ reducer: { cart, favorite } })
    let signal: AbortSignal | null | undefined
    mockFetch.mockImplementation((_url, options) => {
      signal = options?.signal
      return new Promise((_resolve, reject) => {
        signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true }
        )
      })
    })
    render(
      <Provider store={store}>
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/product/phone']}>
            <Routes>
              <Route path="/product/:id" element={<SingleProduct />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    )

    expect(screen.getByRole('heading', { name: product.name })).toBeVisible()
    expect(screen.getByText('$125.00')).toBeVisible()
    const opener = screen.getByRole('button', { name: 'Open chat' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Product assistant' })
    const input = await screen.findByRole('textbox', { name: 'Your question' })
    fireEvent.change(input, { target: { value: 'What is the price?' } })
    fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(signal).toBeDefined())
    expect(signal?.aborted).toBe(false)
    const request = JSON.parse(mockFetch.mock.calls[0][1]?.body as string)
    expect(request.messages[0].metadata).toEqual({ productId: 'phone' })

    if (method === 'button')
      await user.click(screen.getByRole('button', { name: 'Close chat' }))
    else if (method === 'Escape') await user.keyboard('{Escape}')
    else
      await user.click(
        dialog.querySelector<HTMLElement>('[aria-hidden="true"]')!
      )

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(signal?.aborted).toBe(true)
    expect(opener).toHaveFocus()
  }
)
