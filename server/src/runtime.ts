import { createOpenAI } from '@ai-sdk/openai'
import { createApp } from './app.js'
import type { Config } from './config/env.js'
import { connectDatabase } from './config/database.js'
import { createMongoProductsService } from './services/mongodb-products.js'

export async function createRuntimeApp(
  config: Config,
  { serveClient = true }: { serveClient?: boolean } = {}
) {
  await connectDatabase(config.MONGODB_URI)
  return createApp({
    config,
    products: createMongoProductsService(),
    model: config.OPENAI_API_KEY
      ? createOpenAI({ apiKey: config.OPENAI_API_KEY })('o4-mini')
      : undefined,
    serveClient,
  })
}
