import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'

import ClearButton from '@/components/home/filters/ClearButton'

beforeEach(() => jest.useFakeTimers())
afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
})

it('keeps the animation active until the latest click timer finishes', () => {
  const resetFilters = jest.fn()
  render(<ClearButton handleClearButton={resetFilters} />)
  const button = screen.getByRole('button', { name: 'clear filters' })

  fireEvent.click(button)
  act(() => jest.advanceTimersByTime(200))
  fireEvent.click(button)
  act(() => jest.advanceTimersByTime(100))

  expect(button).toHaveClass('animate')
  expect(resetFilters).toHaveBeenCalledTimes(2)
  act(() => jest.advanceTimersByTime(200))
  expect(button).not.toHaveClass('animate')
})

it('cancels the pending animation timer on unmount in StrictMode', () => {
  const { unmount } = render(
    <StrictMode>
      <ClearButton handleClearButton={() => {}} />
    </StrictMode>
  )
  fireEvent.click(screen.getByRole('button', { name: 'clear filters' }))
  expect(jest.getTimerCount()).toBe(1)

  unmount()

  expect(jest.getTimerCount()).toBe(0)
})
