import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'

import Search from '@/components/home/filters/Search'
import { useFilters } from '@/components/home/hooks/useFilters'

const initialUrl = '/?text=Phone&page=3&campaign=sale'

function SearchPage() {
  const { handleFilters } = useFilters()
  const location = useLocation()
  const navigate = useNavigate()
  const [isVisible, setIsVisible] = useState(true)

  return (
    <>
      {isVisible && <Search handleFilters={handleFilters} />}
      <output data-testid="url">{location.search}</output>
      <button onClick={() => navigate('/?text=Phone&price=200&page=3')}>
        Change price
      </button>
      <button onClick={() => navigate('/?text=Tablet&page=2')}>
        Saved search
      </button>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => setIsVisible(false)}>Hide search</button>
    </>
  )
}

function setup() {
  render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <SearchPage />
    </MemoryRouter>
  )
  return screen.getByRole('searchbox', { name: 'Search products' })
}

const advance = (milliseconds: number) => {
  act(() => jest.advanceTimersByTime(milliseconds))
}
const params = () =>
  new URLSearchParams(screen.getByTestId('url').textContent ?? '')

beforeEach(() => jest.useFakeTimers())
afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
})

it('updates the input immediately and applies only the latest text after 500 ms', () => {
  const input = setup()
  expect(input).toHaveValue('Phone')
  fireEvent.change(input, { target: { value: 'Lap' } })
  expect(input).toHaveValue('Lap')
  advance(400)
  expect(params().get('text')).toBe('Phone')

  fireEvent.change(input, { target: { value: 'Laptop' } })
  advance(499)
  expect(params().get('text')).toBe('Phone')
  advance(1)
  expect(params().get('text')).toBe('Laptop')
  expect(params().has('page')).toBe(false)
  expect(params().get('campaign')).toBe('sale')
})

it('clears immediately and cancels a pending search', () => {
  const input = setup()
  fireEvent.change(input, { target: { value: 'Laptop' } })
  advance(200)
  fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
  expect(input).toHaveValue('')
  expect(params().has('text')).toBe(false)
  advance(500)
  expect(params().has('text')).toBe(false)
  expect(params().get('campaign')).toBe('sale')
})

it.each([
  ['Change price', 'Phone'],
  ['Saved search', 'Tablet'],
])(
  'cancels pending input and restores URL text after %s',
  (button, expectedText) => {
    const input = setup()
    fireEvent.change(input, { target: { value: 'Laptop' } })
    advance(200)
    fireEvent.click(screen.getByRole('button', { name: button }))
    expect(input).toHaveValue(expectedText)
    const navigatedUrl = screen.getByTestId('url').textContent
    advance(500)
    expect(screen.getByTestId('url').textContent).toBe(navigatedUrl)
  }
)

it('restores the previous search and cancels pending input on history navigation', () => {
  const input = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Saved search' }))
  expect(input).toHaveValue('Tablet')
  fireEvent.change(input, { target: { value: 'Laptop' } })
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(input).toHaveValue('Phone')
  advance(500)
  expect(screen.getByTestId('url')).toHaveTextContent(initialUrl.slice(1))
})

it('does not apply pending text after Search unmounts', () => {
  const input = setup()
  fireEvent.change(input, { target: { value: 'Laptop' } })
  fireEvent.click(screen.getByRole('button', { name: 'Hide search' }))
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  advance(500)
  expect(screen.getByTestId('url')).toHaveTextContent(initialUrl.slice(1))
})
