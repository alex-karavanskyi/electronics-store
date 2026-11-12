import { Suspense } from 'react'
import Loading from '@/layout/Loading'
import { Outlet, useLocation } from 'react-router-dom'
import ErrorBoundary from '@/shared/ui/ErrorBoundary'
import { CartDrawer } from '@/components/cart'
import { Footer, Navbar } from '@/layout'
import { ReduxProvider } from '@/redux/provider'
import CartHydrator from '@/shared/lib/CartHydrator'
import ProductImagesSync from '@/shared/lib/ProductImagesSync'
import QueryProvider from '@/shared/lib/QueryProvider'
import ThemeProvider from '@/shared/lib/ThemeProvider'
import AppToaster from '@/shared/ui/AppToaster'
import ScrollToPage from './ScrollToPage'
import FavoritesStorageSync from '@/components/favorites/FavoritesStorageSync'
import ProductAccountSync from '@/shared/auth/ProductAccountSync'

export default function AppLayout() {
  return (
    <ThemeProvider>
      <AppToaster />
      <QueryProvider>
        <StoreSession />
      </QueryProvider>
    </ThemeProvider>
  )
}

function StoreSession() {
  const location = useLocation()
  return (
    <ReduxProvider>
      <ProductAccountSync />
      <FavoritesStorageSync />
      <CartHydrator />
      <ProductImagesSync />
      <ScrollToPage />
      <Navbar />
      <main style={{ flex: 1 }}>
        <ErrorBoundary
          resetKey={location.key}
          message="This page could not be displayed. Please reload or visit another page."
        >
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
      <CartDrawer />
    </ReduxProvider>
  )
}
