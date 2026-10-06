import { StrictMode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import ScrollToPage from '@/app/ScrollToPage'

const scrollIntoView = jest.fn()

beforeEach(() => {
  jest.mocked(window.scrollTo).mockClear()
  scrollIntoView.mockClear()
  HTMLElement.prototype.scrollIntoView = scrollIntoView
})

function setup(
  initialEntries = ['/'],
  initialIndex = initialEntries.length - 1,
  anchorId = 'collection'
) {
  return renderHook(useNavigate, {
    wrapper: ({ children }) => (
      <StrictMode>
        <MemoryRouter
          initialEntries={initialEntries}
          initialIndex={initialIndex}
        >
          <ScrollToPage />
          <section id={anchorId} />
          {children}
        </MemoryRouter>
      </StrictMode>
    ),
  })
}

it('leaves the scroll position alone on initial load without a hash', () => {
  setup()
  expect(window.scrollTo).not.toHaveBeenCalled()
  expect(scrollIntoView).not.toHaveBeenCalled()
})

it.each([
  ['/#collection', 'collection'],
  ['/#caf%C3%A9', 'café'],
  ['/#bad%', 'bad%'],
])('scrolls to the anchor once on initial load of %s', (url, anchorId) => {
  setup([url], 0, anchorId)
  expect(scrollIntoView).toHaveBeenCalledTimes(1)
  expect(scrollIntoView.mock.contexts[0]).toBe(
    document.getElementById(anchorId)
  )
  expect(window.scrollTo).not.toHaveBeenCalled()
})

it.each([-1, 1])('does not scroll to an anchor on history step %s', step => {
  const entries =
    step === -1 ? ['/#collection', '/contact'] : ['/contact', '/#collection']
  const { result } = setup(entries, step === -1 ? 1 : 0)

  act(() => result.current(step))

  expect(scrollIntoView).not.toHaveBeenCalled()
  expect(window.scrollTo).not.toHaveBeenCalled()
})

it.each(['', '#collection'])(
  'does not scroll when pushing or replacing query parameters with hash %s',
  hash => {
    const { result } = setup(['/' + hash])
    scrollIntoView.mockClear()

    act(() => result.current({ search: '?text=Phone', hash }))
    act(() =>
      result.current({ search: '?text=Laptop', hash }, { replace: true })
    )

    expect(scrollIntoView).not.toHaveBeenCalled()
    expect(window.scrollTo).not.toHaveBeenCalled()
  }
)

it.each([false, true])(
  'scrolls to the top on pathname navigation with replace=%s',
  replace => {
    const { result } = setup()

    act(() => result.current('/contact', { replace }))

    expect(window.scrollTo).toHaveBeenCalledTimes(1)
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 })
    expect(scrollIntoView).not.toHaveBeenCalled()
  }
)

it('scrolls on a new anchor navigation after returning through history', () => {
  const { result } = setup(['/contact'])
  act(() => result.current('/#collection'))
  expect(scrollIntoView).toHaveBeenCalledTimes(1)

  act(() => result.current(-1))
  expect(window.scrollTo).not.toHaveBeenCalled()
  expect(scrollIntoView).toHaveBeenCalledTimes(1)

  act(() => result.current('/#collection'))
  expect(scrollIntoView).toHaveBeenCalledTimes(2)
})
