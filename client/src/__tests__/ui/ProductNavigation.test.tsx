import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProductNavigation from '@/layout/ProductNavigation'
import { AccessContext, type Access } from '@/shared/auth/useAccess'

const access: Access = {
  status: 'authenticated',
  userId: 'a',
  isAdmin: true,
  getToken: async () => 'token',
}
function tree(value = access) {
  return (
    <MemoryRouter>
      <AccessContext.Provider value={value}>
        <ProductNavigation />
      </AccessContext.Provider>
    </MemoryRouter>
  )
}
it('offers Admin and personal links in a dismissible navigation disclosure only to Admin', () => {
  const view = render(tree())
  const trigger = screen.getByText('Products')
  fireEvent.click(trigger)
  expect(screen.getByRole('link', { name: 'Admin panel' })).toHaveAttribute(
    'href',
    '/admin/products'
  )
  fireEvent.keyDown(trigger, { key: 'Escape' })
  expect(trigger.closest('details')).not.toHaveAttribute('open')
  expect(trigger).toHaveFocus()
  fireEvent.click(trigger)
  fireEvent.pointerDown(document.body)
  expect(trigger.closest('details')).not.toHaveAttribute('open')
  view.rerender(tree({ ...access, isAdmin: false }))
  expect(
    screen.queryByRole('link', { name: 'Admin panel' })
  ).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'My products' })).toBeVisible()
  view.rerender(
    tree({ ...access, status: 'guest', userId: null, isAdmin: false })
  )
  expect(
    screen.queryByRole('link', { name: 'My products' })
  ).not.toBeInTheDocument()
})
