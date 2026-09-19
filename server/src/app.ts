import express from 'express'
import cors from 'cors'
import type { LanguageModel } from 'ai'
import type { Config } from './config/env.js'
import type { ProductsService } from './services/products.js'
import { productsRouter } from './routes/products.js'
import { chatRouter } from './routes/chat.js'
import { errorHandler, HttpError } from './middleware/errors.js'
export function createApp({
  config,
  products,
  model,
}: {
  config: Config
  products: ProductsService
  model?: LanguageModel
}) {
  const app = express()
  app.disable('x-powered-by')
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.CORS_ORIGINS.includes(origin))
          callback(null, true)
        else callback(new HttpError(403, 'Origin is not allowed'))
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      exposedHeaders: ['x-vercel-ai-ui-message-stream'],
    })
  )
  app.use(express.json({ limit: '256kb' }))
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })
  app.use('/api/products', productsRouter(products))
  app.use('/api/chat', chatRouter(products, model))
  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' })
  })
  app.use(errorHandler)
  return app
}
