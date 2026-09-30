import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Pagination from '@/components/home/list/Pagination'

function clickModifiedLink(link: HTMLElement, modifiers: MouseEventInit) {
  let wasPrevented: boolean | undefined
  // React handles the click at the root before it bubbles to document.
  // Record its decision, then stop jsdom's unsupported browser navigation.
  const preventBrowserNavigation = (event: MouseEvent) => {
    wasPrevented = event.defaultPrevented
    event.preventDefault()
  }
  document.addEventListener('click', preventBrowserNavigation)
  try {
    fireEvent.click(link, modifiers)
  } finally {
    document.removeEventListener('click', preventBrowserNavigation)
  }
  expect(wasPrevented).toBe(false)
}
function setup(initialEntry = '/#collection', totalItems = 18) {
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <section id="collection" aria-label="Product catalog" tabIndex={-1}>
        <Pagination pageSize={6} totalItems={totalItems} />
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
  clickModifiedLink(nextPage, { ctrlKey: true })
  expect(nextPage).toHaveFocus()
  fireEvent.click(document.querySelector('a[aria-disabled="true"]')!)
  expect(catalog.scrollIntoView).not.toHaveBeenCalled()
  expect(catalog).not.toHaveFocus()
})

it('labels the navigation and moves between pages with the arrow links', async () => {
  const user = userEvent.setup()
  const catalog = setup('/?page=2#collection')
  expect(
    screen.getByRole('navigation', { name: 'Product pagination' })
  ).toBeVisible()
  const previous = screen.getByRole('link', { name: 'Previous page' })
  expect(previous).toHaveAttribute('href', '/#collection')
  previous.focus()
  await user.keyboard('{Enter}')
  expect(screen.getByRole('link', { name: '1' })).toHaveAttribute(
    'aria-current',
    'page'
  )
  expect(previous).toHaveAttribute('aria-disabled', 'true')
  expect(catalog).toHaveFocus()

  fireEvent.click(screen.getByRole('link', { name: 'Next page' }))
  expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
    'aria-current',
    'page'
  )
  fireEvent.click(screen.getByRole('link', { name: 'Next page' }))
  const next = screen.getByRole('link', { name: 'Next page' })
  expect(next).toHaveAttribute('aria-disabled', 'true')
  expect(next).toHaveAttribute('href', '/?page=3#collection')
  next.focus()
  const scrollCount = jest.mocked(catalog.scrollIntoView).mock.calls.length
  expect(fireEvent.click(next)).toBe(false)
  expect(next).toHaveFocus()
  expect(catalog.scrollIntoView).toHaveBeenCalledTimes(scrollCount)
})

it.each(['ctrlKey', 'metaKey', 'shiftKey', 'altKey'])(
  'preserves modified arrow clicks with %s without moving catalog focus',
  modifier => {
    const catalog = setup('/?page=2#collection')
    const next = screen.getByRole('link', { name: 'Next page' })
    next.focus()
    clickModifiedLink(next, { [modifier]: true })
    expect(next).toHaveFocus()
    expect(catalog.scrollIntoView).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  }
)

it.each([0, 6])('blocks both arrows when totalItems is %s', totalItems => {
  const catalog = setup('/#collection', totalItems)
  for (const name of ['Previous page', 'Next page']) {
    const arrow = screen.getByRole('link', { name })
    expect(arrow).toHaveAttribute('aria-disabled', 'true')
    expect(arrow).toHaveAttribute('href', '/#collection')
    expect(fireEvent.click(arrow)).toBe(false)
  }
  expect(catalog.scrollIntoView).not.toHaveBeenCalled()
})

it('clamps an out-of-range page and preserves filters, extra parameters and hash in links', () => {
  setup(
    '/?page=99&text=Phone&category=phones&price=200&sort=name-z&campaign=sale#collection'
  )
  expect(screen.getByRole('link', { name: '3' })).toHaveAttribute(
    'aria-current',
    'page'
  )
  expect(screen.getByRole('link', { name: 'Next page' })).toHaveAttribute(
    'aria-disabled',
    'true'
  )
  const previous = screen.getByRole('link', { name: 'Previous page' })
  const url = new URL(previous.getAttribute('href')!, 'http://localhost')
  expect(url.hash).toBe('#collection')
  expect(Object.fromEntries(url.searchParams)).toEqual({
    page: '2',
    text: 'Phone',
    category: 'phones',
    price: '200',
    sort: 'name-z',
    campaign: 'sale',
  })
})
