import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { createOpenAI } from '@ai-sdk/openai'
import { parseEnv } from './config/env.js'
import { createProductsService } from './services/products.js'
import { createApp } from './app.js'
// Resolve only the backend's env file, independent of the launch directory.
loadEnv({ path: fileURLToPath(new URL('../.env', import.meta.url)) })
try {
  const config = parseEnv(process.env)
  const model = config.OPENAI_API_KEY
    ? createOpenAI({ apiKey: config.OPENAI_API_KEY })('o4-mini')
    : undefined
  const server = createApp({
    config,
    products: createProductsService(config),
    model,
  }).listen(config.PORT, config.HOST, () => {
    console.log('API listening on http://' + config.HOST + ':' + config.PORT)
    if (!model) console.log('OPENAI_API_KEY is unset; chat returns 503')
  })
  server.on('error', () => {
    console.error('API failed to listen; check HOST and PORT')
    process.exitCode = 1
  })
  for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.once(signal, () => {
      server.close(() => process.exit(0))
      setTimeout(() => process.exit(1), 5000).unref()
    })
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Invalid server configuration'
  )
  process.exitCode = 1
}
