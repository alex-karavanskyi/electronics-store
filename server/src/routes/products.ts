import { Router } from 'express'
import { selectCatalog } from '../services/catalog.js'
import type { ProductsService } from '../services/products.js'
export function productsRouter(products: ProductsService) {
  const router = Router()
  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })
  router.get('/', async (_req, res) => {
    res.json(await products.list())
  })
  router.get('/catalog', async (req, res) => {
    res.json(
      selectCatalog(
        await products.list(),
        new URL(req.originalUrl, 'http://localhost').searchParams
      )
    )
  })
  router.get('/:id', async (req, res) => {
    res.json(await products.get(req.params.id))
  })
  return router
}
