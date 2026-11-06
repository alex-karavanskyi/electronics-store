import type { PropsWithChildren, ReactElement } from 'react'
import { cloneElement } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from '@/redux/store'
import Navbar from '@/layout/Navbar'
import AuthProvider from '@/shared/auth/AuthProvider'
import { useAccess } from '@/shared/auth/useAccess'
import { clientEnv } from '@/shared/config/env'
import ThemeProvider from '@/shared/lib/ThemeProvider'

const mockOpenSignIn = jest.fn()
const mockGetToken = jest.fn()
let mockSession: {
  isLoaded: boolean
  isSignedIn: boolean | undefined
  userId: string | null
  sessionClaims: { role?: unknown } | null
}

// Clerk's hosted UI and session transport are external. Keep our provider,
// access derivation and navbar real; emulate only this SDK boundary.
jest.mock('@clerk/react', () => ({
  ClerkProvider: ({
    children,
    routerPush,
  }: PropsWithChildren<{ routerPush: (path: string) => void }>) => (
    <>
      {children}
      <button onClick={() => routerPush('/favorites')}>Clerk navigation</button>
    </>
  ),
  useAuth: () => ({ ...mockSession, getToken: mockGetToken }),
  SignInButton: ({ children }: { children: ReactElement<{ onClick?: () => void }> }) =>
    cloneElement(children, { onClick: mockOpenSignIn }),
  UserButton: () => (
    <button aria-label="Open account menu">Profile and sign out</button>
  ),
}))

function AccessProbe() {
  const access = useAccess()
  const location = useLocation()
  return (
    <output aria-label="Access">
      {JSON.stringify({
        status: access.status,
        userId: access.userId,
        isAdmin: access.isAdmin,
        path: location.pathname,
      })}
    </output>
  )
}

function TestApp() {
  return (
    <MemoryRouter>
      <AuthProvider>
        <ThemeProvider>
          <Provider store={store}>
            <Navbar />
            <AccessProbe />
          </Provider>
        </ThemeProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

const setup = () => render(<TestApp />)

beforeEach(() => {
  clientEnv.clerkPublishableKey = 'pk_test_fixture'
  mockSession = {
    isLoaded: true,
    isSignedIn: false,
    userId: null,
    sessionClaims: null,
  }
  mockOpenSignIn.mockReset()
  mockGetToken.mockReset()
})

afterEach(() => {
  clientEnv.clerkPublishableKey = ''
})

it('opens Clerk sign in for a guest while the catalog navigation stays available', () => {
  setup()
  fireEvent.click(
    screen.getByRole('button', { name: 'Sign in or create account' })
  )
  expect(mockOpenSignIn).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('link', { name: 'VOLT home' })).toHaveAttribute(
    'href',
    '/'
  )
  expect(screen.getByLabelText('Access')).toHaveTextContent('"status":"guest"')
})

it('does not offer guest actions or admin rights until Clerk has loaded', () => {
  mockSession = {
    isLoaded: false,
    isSignedIn: undefined,
    userId: 'user_old',
    sessionClaims: { role: 'admin' },
  }
  setup()
  expect(screen.getByRole('button', { name: 'Loading account' })).toBeDisabled()
  expect(
    screen.queryByRole('button', { name: 'Sign in or create account' })
  ).not.toBeInTheDocument()
  expect(screen.getByLabelText('Access')).toHaveTextContent(
    '"userId":null,"isAdmin":false'
  )
})

it('exposes the account menu and derives admin UI access only for a signed-in admin', () => {
  mockSession = {
    isLoaded: true,
    isSignedIn: true,
    userId: 'user_one',
    sessionClaims: { role: 'admin' },
  }
  const view = setup()
  expect(
    screen.getByRole('button', { name: 'Open account menu' })
  ).toBeInTheDocument()
  expect(screen.getByLabelText('Access')).toHaveTextContent('"isAdmin":true')
  mockSession = {
    isLoaded: true,
    isSignedIn: false,
    userId: null,
    sessionClaims: null,
  }
  view.rerender(<TestApp />)
  expect(
    screen.queryByRole('button', { name: 'Open account menu' })
  ).not.toBeInTheDocument()
  expect(screen.getByLabelText('Access')).toHaveTextContent(
    '"userId":null,"isAdmin":false'
  )
})

it('renders public navigation with an unavailable account control when no key is configured', () => {
  clientEnv.clerkPublishableKey = ''
  setup()
  expect(
    screen.getByRole('button', { name: 'Sign in unavailable' })
  ).toBeDisabled()
  expect(screen.getByRole('link', { name: 'Favorites' })).toBeInTheDocument()
  expect(screen.getByLabelText('Access')).toHaveTextContent(
    '"status":"unavailable"'
  )
})

it('routes Clerk navigation through the existing router', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: 'Clerk navigation' }))
  expect(screen.getByLabelText('Access')).toHaveTextContent(
    '"path":"/favorites"'
  )
})
