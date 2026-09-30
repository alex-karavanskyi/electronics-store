import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { once } from 'node:events'
import type { Server } from 'node:http'
import { config as loadEnv } from 'dotenv'
import { parseEnv, type Config } from './config/env.js'
import { disconnectDatabase } from './config/database.js'
import { createRuntimeApp } from './runtime.js'

async function shutdown(server: Server) {
  const timer = setTimeout(() => server.closeAllConnections(), 5000)
  timer.unref()
  try {
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve()))
    )
  } finally {
    clearTimeout(timer)
    await disconnectDatabase()
  }
}

export async function startServer(config: Config) {
  try {
    const app = await createRuntimeApp(config)
    const server = app.listen(config.PORT, config.HOST)
    await once(server, 'listening')

    let closePromise: Promise<void> | undefined
    return {
      server,
      close() {
        closePromise ??= shutdown(server)
        return closePromise
      },
    }
  } catch (error) {
    await disconnectDatabase()
    throw error
  }
}

// Importing startServer in tests must not load secrets or start a listener.
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  loadEnv({ path: fileURLToPath(new URL('../.env', import.meta.url)) })
  try {
    const config = parseEnv(process.env)
    const running = await startServer(config)

    console.log('API listening on http://' + config.HOST + ':' + config.PORT)
    if (!config.OPENAI_API_KEY)
      console.log('OPENAI_API_KEY is unset; chat returns 503')

    const handleSignal = async () => {
      try {
        await running.close()
        process.exitCode = 0
      } catch {
        console.error('API shutdown failed')
        process.exitCode = 1
      }
    }

    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, handleSignal)
    }
  } catch {
    // MongoDB errors may contain connection strings; never print raw failures.
    console.error(
      'API startup failed; check server configuration and product source availability'
    )
    process.exitCode = 1
  }
}
