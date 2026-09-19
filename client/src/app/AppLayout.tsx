import { Suspense } from 'react'
import Loading from '@/layout/Loading'
import { Outlet } from 'react-router-dom'
import { CartDrawer } from '@/components/cart'
import { Footer, Navbar, Sidebar } from '@/layout'
import { ReduxProvider } from '@/redux/provider'
import CartHydrator from '@/shared/lib/CartHydrator'
import QueryProvider from '@/shared/lib/QueryProvider'
import ScrollToPage from './ScrollToPage'

export default function AppLayout() {
  return (
    <ReduxProvider>
      <QueryProvider>
        <CartHydrator />
        <ScrollToPage />
        <Navbar />
        <main style={{ flex: 1 }}>
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </main>
        <Footer />
        <Sidebar />
        <CartDrawer />
      </QueryProvider>
    </ReduxProvider>
  )
}
