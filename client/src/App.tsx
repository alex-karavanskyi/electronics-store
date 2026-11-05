import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/app/AppLayout'
import HomePage from '@/pages/HomePage'
import NotFoundPage from '@/pages/NotFoundPage'

const ProductPage = lazy(() => import('@/pages/ProductPage'))
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage'))
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage'))
const MyProductsPage = lazy(() => import('@/pages/MyProductsPage'))
const AdminProductsPage = lazy(() => import('@/pages/AdminProductsPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="product/:id" element={<ProductPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="my-products" element={<MyProductsPage />} />
        <Route path="admin/products" element={<AdminProductsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
