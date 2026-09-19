import { BrowserRouter } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import App from './App'
import './app/globals.scss'
import './app/vite.scss'

const root = document.getElementById('root')
if (!root) throw new Error('Missing application root')
createRoot(root).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
