import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { fireEvent, render, screen } from '@testing-library/react'

import Sort from '@/components/home/filters/Sort'
import catalogView from '@/redux/features/catalogViewSlice'
import { FilterName } from '@/components/home/filters/filterTypes'

it('uses supplied catalog state and keeps view and sorting controls usable', () => {
  const store = configureStore({ reducer: { catalogView } })
  const handleFilters = jest.fn()
  const view = render(
    <Provider store={store}>
      <Sort
        total={14}
        isLoading={false}
        sort="name-z"
        handleFilters={handleFilters}
      />
    </Provider>
  )

  expect(screen.getByText('14 products found')).toBeVisible()
  expect(screen.getByRole('combobox', { name: 'Sort by:' })).toHaveValue(
    'name-z'
  )
  fireEvent.change(screen.getByRole('combobox'), {
    target: { value: 'price-highest' },
  })
  expect(handleFilters).toHaveBeenCalledWith(FilterName.Sort, 'price-highest')
  fireEvent.click(screen.getByRole('button', { name: 'List view' }))
  expect(store.getState().catalogView.grid_view).toBe(false)
  expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  fireEvent.click(screen.getByRole('button', { name: 'Grid view' }))
  expect(store.getState().catalogView.grid_view).toBe(true)

  view.rerender(
    <Provider store={store}>
      <Sort
        total={0}
        isLoading
        sort="price-highest"
        handleFilters={handleFilters}
      />
    </Provider>
  )
  expect(screen.queryByText(/products found/)).not.toBeInTheDocument()
  expect(screen.getByText(/loading/)).toBeVisible()
  expect(screen.getByRole('combobox')).toHaveValue('price-highest')
})
