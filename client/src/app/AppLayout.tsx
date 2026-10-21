import { Suspense } from 'react'
import Loading from '@/layout/Loading'
import { Outlet } from 'react-router-dom'
import { CartDrawer } from '@/components/cart'
import { Footer, Navbar } from '@/layout'
import { ReduxProvider } from '@/redux/provider'
import CartHydrator from '@/shared/lib/CartHydrator'
import ProductImagesSync from '@/shared/lib/ProductImagesSync'
import QueryProvider from '@/shared/lib/QueryProvider'
import ThemeProvider from '@/shared/lib/ThemeProvider'
import ScrollToPage from './ScrollToPage'

export default function AppLayout() {
  return (
    <ThemeProvider>
      <ReduxProvider>
        <QueryProvider>
          <CartHydrator />
          <ProductImagesSync />
          <ScrollToPage />
          <Navbar />
          <main style={{ flex: 1 }}>
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </main>
          <Footer />
          <CartDrawer />
        </QueryProvider>
      </ReduxProvider>
    </ThemeProvider>
  )
}
