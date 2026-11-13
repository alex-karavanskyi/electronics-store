import { CatalogRouter } from '../support/CatalogRouter'
import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useLocation, useNavigate } from 'react-router-dom'

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
      <button
        onClick={() =>
          navigate('/?text=Phone&price=200&campaign=sale', {
            replace: true,
            state: location.state,
          })
        }
      >
        Update after correction
      </button>
      <button
        onClick={() =>
          navigate('/?text=Phone&campaign=sale', {
            replace: true,
            state: { catalogPageCorrection: location.key },
          })
        }
      >
        Correct page
      </button>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => setIsVisible(false)}>Hide search</button>
    </>
  )
}

function setup() {
  render(
    <CatalogRouter initialEntries={[initialUrl]}>
      <SearchPage />
    </CatalogRouter>
  )
  return screen.getByRole('searchbox', { name: 'Search products' })
}

const advance = async (milliseconds: number) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(milliseconds)
  })
}
const params = () =>
  new URLSearchParams(screen.getByTestId('url').textContent ?? '')

beforeEach(() => jest.useFakeTimers())
afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
})

it('updates the input immediately and applies only the latest text after 500 ms', async () => {
  const input = setup()
  expect(input).toHaveValue('Phone')
  fireEvent.change(input, { target: { value: 'Lap' } })
  expect(input).toHaveValue('Lap')
  await advance(400)
  expect(params().get('text')).toBe('Phone')

  fireEvent.change(input, { target: { value: 'Laptop' } })
  await advance(499)
  expect(params().get('text')).toBe('Phone')
  await advance(1)
  await waitFor(() => expect(params().get('text')).toBe('Laptop'))
  expect(params().has('page')).toBe(false)
  expect(params().get('campaign')).toBe('sale')
})

it('clears immediately and cancels a pending search', async () => {
  const input = setup()
  fireEvent.change(input, { target: { value: 'Laptop' } })
  await advance(200)
  fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
  expect(input).toHaveValue('')
  await waitFor(() => expect(params().has('text')).toBe(false))
  await advance(500)
  expect(params().has('text')).toBe(false)
  expect(params().get('campaign')).toBe('sale')
})

it.each([
  ['Change price', 'Phone'],
  ['Saved search', 'Tablet'],
])(
  'cancels pending input and restores URL text after %s',
  async (button, expectedText) => {
    const input = setup()
    fireEvent.change(input, { target: { value: 'Laptop' } })
    await advance(200)
    fireEvent.click(screen.getByRole('button', { name: button }))
    expect(input).toHaveValue(expectedText)
    const navigatedUrl = screen.getByTestId('url').textContent
    await advance(500)
    expect(screen.getByTestId('url').textContent).toBe(navigatedUrl)
  }
)

it('restores the previous search and cancels pending input on history navigation', async () => {
  const input = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Saved search' }))
  expect(input).toHaveValue('Tablet')
  fireEvent.change(input, { target: { value: 'Laptop' } })
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(input).toHaveValue('Phone')
  await advance(500)
  expect(screen.getByTestId('url')).toHaveTextContent(initialUrl.slice(1))
})

it('does not apply pending text after Search unmounts', async () => {
  const input = setup()
  fireEvent.change(input, { target: { value: 'Laptop' } })
  fireEvent.click(screen.getByRole('button', { name: 'Hide search' }))
  expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  await advance(500)
  expect(screen.getByTestId('url')).toHaveTextContent(initialUrl.slice(1))
})

it('preserves a pending draft across automatic page correction but resets it on history navigation', async () => {
  const input = setup()
  fireEvent.change(input, { target: { value: 'Laptop' } })
  await advance(200)
  fireEvent.click(screen.getByRole('button', { name: 'Correct page' }))
  expect(input).toHaveValue('Laptop')
  await advance(300)
  await waitFor(() => expect(params().get('text')).toBe('Laptop'))
  expect(params().get('campaign')).toBe('sale')
  fireEvent.change(input, { target: { value: 'pending' } })
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(input).toHaveValue('Phone')
  await advance(500)
  expect(params().get('text')).toBe('Phone')
})

it('cancels pending input when a later URL update inherits page-correction state', async () => {
  const input = setup()
  fireEvent.click(screen.getByRole('button', { name: 'Correct page' }))
  fireEvent.change(input, { target: { value: 'Laptop' } })
  await advance(200)
  fireEvent.click(
    screen.getByRole('button', { name: 'Update after correction' })
  )
  expect(input).toHaveValue('Phone')
  await advance(500)
  expect(params().get('text')).toBe('Phone')
  expect(params().get('price')).toBe('200')
})
