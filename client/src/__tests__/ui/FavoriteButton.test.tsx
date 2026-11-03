import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/shared/lib/queryClient'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FavoriteButton from '@/shared/ui/FavoriteButton'
import { Product } from '@/shared/types/productSchema'
import { AccessContext, unavailableAccess } from '@/shared/auth/useAccess'

const product: Product = {
  id: 'one',
  name: 'Test phone',
  price: 10,
  description: 'Phone',
  image: '',
  images: [],
  category: 'phones',
}

beforeEach(() => localStorage.clear())

it('persists only favorite IDs when a product is selected', async () => {
  const user = userEvent.setup()
  const client = createQueryClient()
  render(
    <QueryClientProvider client={client}>
      <FavoriteButton product={product} />
    </QueryClientProvider>
  )
  await user.click(screen.getByRole('button', { name: 'Favorite Test phone' }))
  expect(JSON.parse(localStorage.getItem('volt_favorites')!)).toEqual({
    version: 1,
    ids: ['one'],
    pendingImports: [],
  })
})

it('disables favorite changes until Clerk has determined the current account', () => {
  const client = createQueryClient()
  render(
    <AccessContext.Provider value={{ ...unavailableAccess, status: 'loading' }}>
      <QueryClientProvider client={client}>
        <FavoriteButton product={product} />
      </QueryClientProvider>
    </AccessContext.Provider>
  )
  expect(
    screen.getByRole('button', { name: 'Favorite Test phone' })
  ).toBeDisabled()
})

it('toggles favorites using both Enter and Space and exposes the pressed state', async () => {
  const user = userEvent.setup()
  const client = createQueryClient()
  render(
    <QueryClientProvider client={client}>
      <FavoriteButton product={product} />
    </QueryClientProvider>
  )
  await user.tab()
  const button = screen.getByRole('button', { name: 'Favorite Test phone' })
  expect(button).toHaveFocus()
  expect(button).toHaveAttribute('aria-pressed', 'false')
  await user.keyboard('{Enter}')
  expect(button).toHaveAttribute('aria-pressed', 'true')
  expect(JSON.parse(localStorage.getItem('volt_favorites')!).ids).toEqual([
    'one',
  ])
  await user.keyboard(' ')
  expect(button).toHaveAttribute('aria-pressed', 'false')
  expect(JSON.parse(localStorage.getItem('volt_favorites')!).ids).toEqual([])
})
