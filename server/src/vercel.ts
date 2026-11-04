import express from 'express'
import { EnvironmentError, parseEnv } from './config/env.js'
import { createRuntimeApp } from './runtime.js'

export function createVercelApp(env: NodeJS.ProcessEnv = process.env) {
  let appPromise: ReturnType<typeof createRuntimeApp> | undefined
  const app = express()
  app.disable('x-powered-by')
  app.use(async (req, res, next) => {
    let stage = 'environment'
    try {
      if (!appPromise) {
        const config = parseEnv(env)
        // Trust configured platform aliases, never request Host/Origin headers.
        stage = 'platform-origins'
        for (const host of [
          env.VERCEL_URL,
          env.VERCEL_PROJECT_PRODUCTION_URL,
          env.VERCEL_BRANCH_URL,
        ]) {
          if (host) config.CORS_ORIGINS.push(new URL('https://' + host).origin)
        }
        // Share initialization and the database pool across concurrent invocations.
        stage = 'runtime'
        appPromise = createRuntimeApp(config, { serveClient: false }).catch(
          error => {
            appPromise = undefined
            throw error
          }
        )
      }
      stage = 'runtime'
      const runtimeApp = await appPromise
      runtimeApp(req, res, next)
    } catch (error) {
      // Log only controlled metadata, never raw errors or environment values.
      console.error('API initialization failed', {
        stage,
        ...(error instanceof EnvironmentError
          ? { invalidVariables: error.invalidVariables }
          : {}),
      })
      res.set('Cache-Control', 'no-store')
      res.status(503).json({ error: 'Product service unavailable' })
    }
  })
  return app
}

export default createVercelApp()
