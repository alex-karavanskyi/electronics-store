import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@/app/AppLayout'
import HomePage from '@/pages/HomePage'
import NotFoundPage from '@/pages/NotFoundPage'

const ProductPage = lazy(() => import('@/pages/ProductPage'))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'))
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="product/:id" element={<ProductPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="contact" element={<Navigate to="/checkout" replace />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
