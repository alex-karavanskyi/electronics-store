import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Pagination from '@/components/home/list/Pagination'

function setup() {
  render(
    <MemoryRouter initialEntries={['/#collection']}>
      <section id="collection" aria-label="Product catalog" tabIndex={-1}>
        <Pagination postsPerPage={6} totalPosts={18} />
      </section>
    </MemoryRouter>
  )
  const catalog = screen.getByRole('region', { name: 'Product catalog' })
  catalog.scrollIntoView = jest.fn()
  return catalog
}

it('moves keyboard focus and scrolls to the catalog when selecting a page', async () => {
  const user = userEvent.setup()
  const catalog = setup()
  expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
    'href',
    '/?page=2#collection'
  )
  screen.getByRole('link', { name: '2' }).focus()
  await user.keyboard('{Enter}')
  expect(catalog).toHaveFocus()
  expect(catalog.scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
  expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
    'aria-current',
    'page'
  )
})

it('does not scroll or move focus for a modified click or disabled page link', () => {
  const catalog = setup()
  const nextPage = screen.getByRole('link', { name: '2' })
  nextPage.focus()
  fireEvent.click(nextPage, { ctrlKey: true })
  expect(nextPage).toHaveFocus()
  fireEvent.click(document.querySelector('a[aria-disabled="true"]')!)
  expect(catalog.scrollIntoView).not.toHaveBeenCalled()
  expect(catalog).not.toHaveFocus()
})
