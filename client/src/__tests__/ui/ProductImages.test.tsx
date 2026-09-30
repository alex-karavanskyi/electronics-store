import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import ProductImages from '@/components/product/ProductImages'

const images = ['/front.jpg', '/back.jpg', '/side.jpg']
const mainImage = () => screen.getAllByRole('img')[0]

it('describes the product and selects a thumbnail with the keyboard', async () => {
  const user = userEvent.setup()
  render(<ProductImages images={images} productName="Fixture Phone" />)
  expect(mainImage()).toHaveAttribute('alt', 'Fixture Phone')
  expect(mainImage()).toHaveAttribute('src', '/front.jpg')
  expect(mainImage()).toHaveAttribute('loading', 'eager')
  const first = screen.getByRole('button', { name: 'Show product image 1' })
  const second = screen.getByRole('button', { name: 'Show product image 2' })
  expect(first).toHaveAttribute('aria-pressed', 'true')
  second.focus()
  await user.keyboard('{Enter}')
  expect(mainImage()).toHaveAttribute('src', '/back.jpg')
  expect(second).toHaveAttribute('aria-pressed', 'true')
  expect(first).toHaveAttribute('aria-pressed', 'false')
  expect(
    screen.queryByRole('button', { name: 'Open chat' })
  ).not.toBeInTheDocument()
})

it('preserves the selected image when the array is recreated or reordered', () => {
  const { rerender } = render(
    <ProductImages images={images} productName="Phone" />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Show product image 2' }))
  expect(mainImage()).toHaveAttribute('src', '/back.jpg')

  rerender(<ProductImages images={[...images]} productName="Phone" />)
  expect(mainImage()).toHaveAttribute('src', '/back.jpg')
  rerender(
    <ProductImages
      images={['/side.jpg', '/front.jpg', '/back.jpg']}
      productName="Phone"
    />
  )
  expect(mainImage()).toHaveAttribute('src', '/back.jpg')
  expect(
    screen.getByRole('button', { name: 'Show product image 3' })
  ).toHaveAttribute('aria-pressed', 'true')
})

it('falls back to the first image when the selection is removed', () => {
  const { rerender } = render(
    <ProductImages images={images} productName="Phone" />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Show product image 2' }))
  rerender(
    <ProductImages images={['/side.jpg', '/front.jpg']} productName="Phone" />
  )
  expect(mainImage()).toHaveAttribute('src', '/side.jpg')
  expect(
    screen.getByRole('button', { name: 'Show product image 1' })
  ).toHaveAttribute('aria-pressed', 'true')
})

it('clears the previous image for an empty gallery and selects the first when images return', () => {
  const { rerender } = render(
    <ProductImages images={images} productName="Phone" />
  )
  fireEvent.click(screen.getByRole('button', { name: 'Show product image 2' }))
  rerender(<ProductImages images={[]} productName="Phone" />)
  expect(mainImage()).not.toHaveAttribute('src')
  expect(
    screen.queryByRole('button', { name: /Show product image/ })
  ).not.toBeInTheDocument()

  rerender(<ProductImages images={[...images]} productName="Phone" />)
  expect(mainImage()).toHaveAttribute('src', '/front.jpg')
})

it('shows no thumbnails when there is only one image', () => {
  render(<ProductImages images={['/front.jpg']} productName="Phone" />)
  expect(mainImage()).toHaveAttribute('src', '/front.jpg')
  expect(
    screen.queryByRole('button', { name: /Show product image/ })
  ).not.toBeInTheDocument()
})

it('opens chat without submitting an enclosing form', () => {
  const onChatOpen = jest.fn()
  const onSubmit = jest.fn(event => event.preventDefault())
  render(
    <form onSubmit={onSubmit}>
      <ProductImages
        images={images}
        productName="Phone"
        onChatOpen={onChatOpen}
      />
    </form>
  )
  fireEvent.click(screen.getByRole('button', { name: 'Open chat' }))
  expect(onChatOpen).toHaveBeenCalledTimes(1)
  expect(onSubmit).not.toHaveBeenCalled()
})
