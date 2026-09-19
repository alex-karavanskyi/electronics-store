import { render, screen } from '@testing-library/react'
import Image from '@/shared/ui/Image'
it('renders a native fill image without component-only DOM attributes', () => {
  render(<Image src="/product.jpg" alt="Product" fill priority />)
  const img = screen.getByRole('img')
  expect(img).toHaveAttribute('loading', 'eager')
  expect(img).toHaveStyle({
    position: 'absolute',
    width: '100%',
    height: '100%',
  })
  expect(img).not.toHaveAttribute('fill')
  expect(img).not.toHaveAttribute('priority')
})
