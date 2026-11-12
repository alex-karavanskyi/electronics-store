import { Router } from 'express'
import type {
  ProductsService,
  ProductWrites,
  CatalogProductsService,
  HomeProductsService,
} from '../services/products.js'
import { getSession, requireUser } from '../middleware/auth.js'
import { HttpError } from '../middleware/errors.js'
import type { ProductNotifications } from '../services/product-notifications.js'
import {
  createProductSchema,
  updateProductSchema,
  productWriteIdSchema,
  deleteProductBodySchema,
  parseProductInput,
} from '../validation/productInput.js'

export function productsRouter(
  products: ProductsService &
    Partial<CatalogProductsService & HomeProductsService>,
  writes?: ProductWrites,
  notifications?: ProductNotifications
) {
  const router = Router()
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })
  router.get('/', async (_req, res) => {
    res.json(await products.list())
  })
  router.get('/catalog', async (req, res) => {
    if (!products.catalog)
      throw new HttpError(503, 'Product service temporarily unavailable')
    res.json(
      await products.catalog(
        new URL(req.originalUrl, 'http://localhost').searchParams
      )
    )
  })
  router.get('/home', async (_req, res) => {
    if (!products.home)
      throw new HttpError(503, 'Product service temporarily unavailable')
    res.json(await products.home())
  })
  router.get('/:id', async (req, res) => {
    res.json(await products.get(req.params.id))
  })
  const writer = () => {
    if (!writes)
      throw new HttpError(503, 'Product writes are temporarily unavailable')
    return writes
  }
  router.post('/', requireUser, async (req, res) => {
    const input = parseProductInput(createProductSchema, req.body)
    const product = await writer().create(input, getSession(req))
    // The durable job was saved with the product. A provider/worker failure
    // must never turn a successful publication into a retryable POST error.
    try {
      await notifications?.sendProductNotification(product.id)
    } catch {
      /* scheduler recovers the durable job */
    }
    res.status(201).json(product)
  })
  router.patch('/:id', requireUser, async (req, res) => {
    const id = parseProductInput(productWriteIdSchema, req.params.id)
    const input = parseProductInput(updateProductSchema, req.body)
    res.json(await writer().update(id, input, getSession(req)))
  })
  router.delete('/:id', requireUser, async (req, res) => {
    const id = parseProductInput(productWriteIdSchema, req.params.id)
    parseProductInput(deleteProductBodySchema, req.body ?? {})
    await writer().remove(id, getSession(req))
    res.status(204).end()
  })
  return router
}
