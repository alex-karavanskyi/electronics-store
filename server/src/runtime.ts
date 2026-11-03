import { createOpenAI } from '@ai-sdk/openai'
import { createApp } from './app.js'
import type { Config } from './config/env.js'
import { connectDatabase } from './config/database.js'
import { createMongoProductsService } from './services/mongodb-products.js'
import { createMongoFavoritesService } from './services/mongodb-favorites.js'
import { createTelegramSender } from './services/telegram.js'
import { createMongoProductNotifications } from './services/mongodb-product-notifications.js'

export async function createRuntimeApp(
  config: Config,
  { serveClient = true }: { serveClient?: boolean } = {}
) {
  await connectDatabase(config.MONGODB_URI)
  const sender = createTelegramSender(config)
  const products = createMongoProductsService({
    notificationsConfigured: Boolean(sender),
  })
  return createApp({
    config,
    products,
    productWrites: products,
    ownedProducts: products,
    adminProducts: products,
    notifications: createMongoProductNotifications(sender),
    favorites: createMongoFavoritesService(),
    model: config.OPENAI_API_KEY
      ? createOpenAI({ apiKey: config.OPENAI_API_KEY })('o4-mini')
      : undefined,
    serveClient,
  })
}
