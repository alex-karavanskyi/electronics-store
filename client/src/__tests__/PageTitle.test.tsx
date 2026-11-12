import { render } from '@testing-library/react'
import PageTitle from '@/shared/ui/PageTitle'

it('owns a single title in head and removes it on unmount', () => {
  const { rerender, unmount } = render(<PageTitle title="Favorites" />)
  expect(document.title).toBe('Favorites | React App')
  expect(document.head.querySelectorAll('title')).toHaveLength(1)
  rerender(<PageTitle title="Checkout" />)
  expect(document.title).toBe('Checkout | React App')
  expect(document.head.querySelectorAll('title')).toHaveLength(1)
  unmount()
  expect(document.head.querySelectorAll('title')).toHaveLength(0)
})
