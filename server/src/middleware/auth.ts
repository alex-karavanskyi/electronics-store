import { clerkMiddleware, getAuth } from '@clerk/express'
import type { Request, RequestHandler } from 'express'
import type { Config } from '../config/env.js'
import { HttpError } from './errors.js'

export function createAuthMiddleware(config: Config): RequestHandler {
  if (!config.CLERK_PUBLISHABLE_KEY || !config.CLERK_SECRET_KEY) {
    return (_req, _res, next) => next()
  }
  return clerkMiddleware({
    publishableKey: config.CLERK_PUBLISHABLE_KEY,
    secretKey: config.CLERK_SECRET_KEY,
    jwtKey: config.CLERK_JWT_KEY,
    authorizedParties: config.CORS_ORIGINS,
  })
}

export function getSession(req: Request) {
  if (!('auth' in req))
    throw new HttpError(503, 'Authentication is unavailable')
  const auth = getAuth(req, { acceptsToken: 'session_token' })
  if (!auth.isAuthenticated || !auth.userId) {
    throw new HttpError(401, 'Sign in to continue')
  }
  return {
    userId: auth.userId,
    role:
      auth.sessionClaims.role === 'admin'
        ? ('admin' as const)
        : ('user' as const),
  }
}

export const requireUser: RequestHandler = (req, res, next) => {
  res.set('Cache-Control', 'private, no-store')
  getSession(req)
  next()
}

export const requireAdmin: RequestHandler = (req, res, next) => {
  res.set('Cache-Control', 'private, no-store')
  if (getSession(req).role !== 'admin') {
    throw new HttpError(403, 'Administrator access required')
  }
  next()
}
