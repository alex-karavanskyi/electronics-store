import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'node:url'
import type { LanguageModel } from 'ai'
import type { Config } from './config/env.js'
import type {
  ProductsService,
  ProductWrites,
  OwnedProductsService,
  AdminProductsService,
} from './services/products.js'
import { productsRouter } from './routes/products.js'
import { chatRouter } from './routes/chat.js'
import { errorHandler, HttpError } from './middleware/errors.js'
import { createAuthMiddleware } from './middleware/auth.js'
import { meRouter } from './routes/me.js'
import { adminProductsRouter } from './routes/admin-products.js'
import { favoritesRouter } from './routes/favorites.js'
import type { FavoritesService } from './services/favorites.js'
import type { ProductNotifications } from './services/product-notifications.js'
import { productNotificationsRouter } from './routes/product-notifications.js'

export function createApp({
  config,
  products,
  productWrites,
  ownedProducts,
  adminProducts,
  favorites,
  notifications,
  model,
  serveClient = true,
}: {
  config: Config
  products: ProductsService
  productWrites?: ProductWrites
  ownedProducts?: OwnedProductsService
  adminProducts?: AdminProductsService
  favorites?: FavoritesService
  notifications?: ProductNotifications
  model?: LanguageModel
  serveClient?: boolean
}) {
  const app = express()
  app.disable('x-powered-by')
  app.use(
    '/api',
    cors({
      origin(origin, callback) {
        if (!origin || config.CORS_ORIGINS.includes(origin))
          callback(null, true)
        else callback(new HttpError(403, 'Origin is not allowed'))
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['x-vercel-ai-ui-message-stream'],
    })
  )
  app.use(express.json({ limit: '256kb' }))
  // Scheduler bearer tokens are independent of Clerk sessions.
  app.use(
    '/api/internal/product-notifications',
    productNotificationsRouter(
      config.PRODUCT_NOTIFICATIONS_CRON_SECRET,
      notifications
    )
  )
  app.use('/api', createAuthMiddleware(config))
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })
  app.use(
    '/api/products',
    productsRouter(products, productWrites, notifications)
  )
  app.use('/api/me/favorites', favoritesRouter(favorites))
  app.use('/api/me', meRouter(ownedProducts))
  app.use(
    '/api/admin/products',
    adminProductsRouter(adminProducts, notifications)
  )
  app.use('/api/chat', chatRouter(products, model))
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' })
  })

  if (serveClient) {
    const clientDist = fileURLToPath(
      new URL('../../client/dist/', import.meta.url)
    )
    app.use(express.static(clientDist))
    app.get('/{*path}', (_req, res, next) => {
      res.sendFile('index.html', { root: clientDist }, error => {
        if (error) next(error)
      })
    })
  }
  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' })
  })
  app.use(errorHandler)
  return app
}
