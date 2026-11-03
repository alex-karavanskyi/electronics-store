import { Router } from 'express'
import { createHash, timingSafeEqual } from 'node:crypto'
import type { ProductNotifications } from '../services/product-notifications.js'
import { HttpError } from '../middleware/errors.js'

export function productNotificationsRouter(
  secret?: string,
  notifications?: ProductNotifications
) {
  const router = Router()
  router.use((_req, res, next) => {
    res.set('Cache-Control', 'private, no-store')
    next()
  })
  router.get('/', async (req, res) => {
    if (!secret || !notifications)
      throw new HttpError(503, 'Notifications are unavailable')
    const digest = (value: string) =>
      createHash('sha256').update(value).digest()
    if (
      !timingSafeEqual(
        digest(req.get('Authorization') ?? ''),
        digest('Bearer ' + secret)
      )
    )
      throw new HttpError(401, 'Invalid scheduler credentials')
    res.json(await notifications.processProductNotifications())
  })
  return router
}
