import { fireEvent, render, screen } from '@testing-library/react'
import Price from '@/components/home/filters/Price'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'

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

it('updates both bounds with the keyboard without losing the other bound', async () => {
  function Example() {
    const [minimum, setMinimum] = useState(30)
    const [maximum, setMaximum] = useState(70)
    return (
      <Price
        minPrice={minimum}
        price={maximum}
        min_price={10}
        max_price={100}
        handleFilters={(name, value) => {
          if (name === 'minPrice') setMinimum(value)
          if (name === 'price') setMaximum(value)
        }}
      />
    )
  }
  const user = userEvent.setup()
  render(<Example />)
  screen.getByRole('slider', { name: 'Minimum price' }).focus()
  await user.keyboard('{ArrowRight}')
  expect(screen.getByRole('spinbutton', { name: 'Minimum price' })).toHaveValue(
    31
  )
  expect(screen.getByRole('spinbutton', { name: 'Maximum price' })).toHaveValue(
    70
  )
  screen.getByRole('slider', { name: 'Maximum price' }).focus()
  await user.keyboard('{ArrowLeft}')
  expect(screen.getByRole('spinbutton', { name: 'Maximum price' })).toHaveValue(
    69
  )
  expect(screen.getByRole('spinbutton', { name: 'Minimum price' })).toHaveValue(
    31
  )
})

it('does not change a range with a single available price', async () => {
  const handleFilters = jest.fn()
  const user = userEvent.setup()
  render(
    <Price
      price={10}
      minPrice={10}
      min_price={10}
      max_price={10}
      handleFilters={handleFilters}
    />
  )
  const minimum = screen.getByRole('slider', { name: 'Minimum price' })
  minimum.focus()
  await user.keyboard('{ArrowRight}')
  expect(handleFilters).not.toHaveBeenCalled()
  expect(screen.getByRole('spinbutton', { name: 'Minimum price' })).toHaveValue(
    10
  )
})

it.each([
  ['Minimum price', '{End}', 'minPrice', 70],
  ['Maximum price', '{Home}', 'price', 30],
] as const)('changes only %s with %s', async (name, key, filter, value) => {
  const user = userEvent.setup()
  const handleFilters = jest.fn()
  render(
    <Price
      minPrice={30}
      price={70}
      min_price={10}
      max_price={100}
      handleFilters={handleFilters}
    />
  )
  screen.getByRole('slider', { name }).focus()
  await user.keyboard(key)
  expect(handleFilters).toHaveBeenCalledTimes(1)
  expect(handleFilters).toHaveBeenCalledWith(filter, value)
})

it.each([
  ['Minimum price', '{ArrowRight}'],
  ['Maximum price', '{ArrowLeft}'],
])(
  'does not cross the other bound or move focus from %s',
  async (name, key) => {
    const user = userEvent.setup()
    const handleFilters = jest.fn()
    render(
      <Price
        minPrice={50}
        price={50}
        min_price={10}
        max_price={100}
        handleFilters={handleFilters}
      />
    )
    const thumb = screen.getByRole('slider', { name })
    thumb.focus()
    await user.keyboard(key)
    expect(handleFilters).not.toHaveBeenCalled()
    expect(thumb).toHaveFocus()
  }
)
