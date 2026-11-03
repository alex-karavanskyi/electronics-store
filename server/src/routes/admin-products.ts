import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { HttpError } from '../middleware/errors.js'
import type { AdminProductsService } from '../services/products.js'
import type { ProductNotifications } from '../services/product-notifications.js'
import {
  parseProductInput,
  productWriteIdSchema,
  deleteProductBodySchema,
} from '../validation/productInput.js'

export function adminProductsRouter(
  products?: AdminProductsService,
  notifications?: ProductNotifications
) {
  const router = Router()
  router.use(requireAdmin)
  router.post('/:id/notification/retry', async (req, res) => {
    const id = parseProductInput(productWriteIdSchema, req.params.id)
    parseProductInput(deleteProductBodySchema, req.body ?? {})
    if (!notifications)
      throw new HttpError(503, 'Notifications are unavailable')
    res.json({ status: await notifications.retry(id) })
  })
  router.get('/', async (_req, res) => {
    if (!products)
      throw new HttpError(503, 'Product service temporarily unavailable')
    const controller = new AbortController()
    const abort = () => controller.abort()
    res.once('close', abort)
    try {
      res.json(await products.listForAdmin(controller.signal))
    } finally {
      res.off('close', abort)
    }
  })
  return router
}
