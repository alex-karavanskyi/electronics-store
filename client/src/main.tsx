import { BrowserRouter } from 'react-router-dom'
import { NuqsAdapter } from 'nuqs/adapters/react-router/v7'
import { createRoot } from 'react-dom/client'
import App from './App'
import AuthProvider from '@/shared/auth/AuthProvider'
import './app/globals.scss'
import './app/vite.scss'

const root = document.getElementById('root')

if (!root) throw new Error('Missing application root')

createRoot(root).render(
  <BrowserRouter>
    <NuqsAdapter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </NuqsAdapter>
  </BrowserRouter>
)
