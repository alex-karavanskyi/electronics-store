import { BrowserRouter } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import App from './App'
import AuthProvider from '@/shared/auth/AuthProvider'
import './app/globals.scss'
import './app/vite.scss'

const root = document.getElementById('root')

if (!root) throw new Error('Missing application root')

createRoot(root).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
)
