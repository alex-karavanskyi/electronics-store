import { render, screen } from '@testing-library/react'

import HomePage, { metadata } from '@/app/page'

jest.mock('@/components/home', () => ({
  Hero: jest.fn(() => <div data-testid="hero">Hero</div>),
  Slider: jest.fn(() => <div data-testid="slider">Slider</div>),
  ProductControls: jest.fn(() => (
    <div data-testid="product-controls">ProductControls</div>
  )),
  ProductList: jest.fn(() => <div data-testid="product-list">ProductList</div>),
}))

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all main components', () => {
    render(<HomePage />)

    expect(screen.getByTestId('slider')).toBeInTheDocument()
    expect(screen.getByTestId('product-controls')).toBeInTheDocument()
    expect(screen.getByTestId('product-list')).toBeInTheDocument()
  })

  it('has correct metadata', () => {
    expect(metadata).toEqual({
      title: 'E-Commerce | React App',
    })
  })
})
