import { fireEvent, render, screen } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import AppLayout from '@/app/AppLayout'

jest.mock('@/layout', () => ({
  Navbar: () => (
    <nav>
      <Link to="/healthy">Store navigation</Link>
    </nav>
  ),
  Footer: () => <footer>Store footer</footer>,
}))
jest.mock('@/components/cart', () => ({ CartDrawer: () => null }))
jest.mock('@/shared/lib/CartHydrator', () => () => null)
jest.mock('@/shared/lib/ProductImagesSync', () => () => null)
jest.mock('@/components/favorites/FavoritesStorageSync', () => () => null)
jest.mock('@/shared/auth/ProductAccountSync', () => () => null)

function BrokenPage(): never {
  throw new Error('private render failure')
}

it('contains a page render failure, retains the shell and recovers on navigation', async () => {
  const errors = jest.spyOn(console, 'error').mockImplementation(() => {})
  try {
    render(
      <MemoryRouter initialEntries={['/broken']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/broken" element={<BrokenPage />} />
            <Route path="/healthy" element={<h1>Healthy page</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This page could not be displayed'
    )
    expect(screen.queryByText('private render failure')).not.toBeInTheDocument()
    expect(screen.getByText('Store footer')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeVisible()
    fireEvent.click(screen.getByRole('link', { name: 'Store navigation' }))
    expect(
      await screen.findByRole('heading', { name: 'Healthy page' })
    ).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  } finally {
    errors.mockRestore()
  }
})
