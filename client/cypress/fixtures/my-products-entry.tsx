// Test-only entry, served by Vite to the HTML intercepted in my-products.cy.js.
// It is never imported by the production entry or included in the app build.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import App from '../../src/App'
import { AccessContext } from '../../src/shared/auth/useAccess'
import '../../src/app/globals.scss'

declare global {
  interface Window {
    setTestAccount: (userId: string | null) => void
    setTestRole: (isAdmin: boolean) => void
    navigateTest: (path: string) => void
  }
}

function NavigationBoundary() {
  const navigate = useNavigate()
  window.navigateTest = path => {
    void navigate(path)
  }
  return null
}

function Harness() {
  const administrative = window.location.pathname === '/__admin-products-test'
  const lifecycle = window.location.pathname === '/__product-management-test'
  const [userId, setUserId] = useState<string | null>(lifecycle ? null : 'A')
  const [isAdmin, setIsAdmin] = useState(administrative)
  window.setTestAccount = setUserId
  window.setTestRole = setIsAdmin
  return (
    <AccessContext.Provider
      value={{
        status: userId ? 'authenticated' : 'guest',
        userId,
        isAdmin,
        getToken: async () => userId,
      }}
    >
      <MemoryRouter
        initialEntries={[administrative ? '/admin/products' : '/my-products']}
      >
        <NavigationBoundary />
        <App />
      </MemoryRouter>
    </AccessContext.Provider>
  )
}

createRoot(document.getElementById('root')!).render(<Harness />)
