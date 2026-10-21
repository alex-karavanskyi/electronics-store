import { fireEvent, render, screen } from '@testing-library/react'
import Price from '@/components/home/filters/Price'

it('provides editable bounds and two accessible slider handles', () => {
  const handleFilters = jest.fn()
  render(
    <Price
      price={100}
      min_price={10}
      max_price={100}
      handleFilters={handleFilters}
    />
  )
  expect(screen.getAllByRole('slider')).toHaveLength(2)
  const minimum = screen.getByRole('spinbutton', { name: 'Minimum price' })
  fireEvent.change(minimum, { target: { value: '30' } })
  fireEvent.blur(minimum)
  expect(handleFilters).toHaveBeenCalledWith('minPrice', 30)
  const maximum = screen.getByRole('spinbutton', { name: 'Maximum price' })
  fireEvent.change(maximum, { target: { value: '5' } })
  fireEvent.blur(maximum)
  expect(handleFilters).toHaveBeenCalledWith('price', 10)
})
