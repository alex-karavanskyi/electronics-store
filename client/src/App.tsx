import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from '@/app/AppLayout'
import HomePage from '@/pages/HomePage'
import NotFoundPage from '@/pages/NotFoundPage'

const ProductPage = lazy(() => import('@/pages/ProductPage'))
const ContactPage = lazy(() => import('@/pages/ContactPage'))
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage'))

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="product/:id" element={<ProductPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
