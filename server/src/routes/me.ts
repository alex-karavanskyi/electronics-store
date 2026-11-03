import { Router } from 'express'
import { getSession, requireUser } from '../middleware/auth.js'
import { HttpError } from '../middleware/errors.js'
import type { OwnedProductsService } from '../services/products.js'

export function meRouter(products?: OwnedProductsService) {
  const router = Router()
  router.use(requireUser)
  router.get('/', (req, res) => {
    res.json(getSession(req))
  })
  router.get('/products', async (req, res) => {
    if (!products)
      throw new HttpError(503, 'Product service temporarily unavailable')
    res.json(await products.listOwned(getSession(req).userId))
  })
  return router
}
