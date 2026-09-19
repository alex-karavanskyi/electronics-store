import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from '@/redux/store'
import Pagination from '@/components/home/list/Pagination'
function Location() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <output data-testid="url">{location.search}</output>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => navigate(1)}>Forward</button>
    </>
  )
}
it('uses URL pagination over saved data, preserves parameters and supports history', () => {
  localStorage.setItem('pagination', '99')
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/?page=2&text=Phone&campaign=sale']}>
        <Location />
        <Pagination postsPerPage={6} totalPosts={18} />
      </MemoryRouter>
    </Provider>
  )
  expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
    'aria-current',
    'page'
  )
  fireEvent.click(screen.getByRole('link', { name: '3' }))
  expect(screen.getByTestId('url')).toHaveTextContent(
    'campaign=sale&text=Phone&page=3'
  )
  fireEvent.click(screen.getByText('Back'))
  expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
    'aria-current',
    'page'
  )
  fireEvent.click(screen.getByText('Forward'))
  expect(screen.getByRole('link', { name: '3' })).toHaveAttribute(
    'aria-current',
    'page'
  )
  window.dispatchEvent(
    new StorageEvent('storage', { key: 'pagination', newValue: '1' })
  )
  expect(screen.getByRole('link', { name: '3' })).toHaveAttribute(
    'aria-current',
    'page'
  )
  expect(localStorage.getItem('pagination')).toBe('99')
})
