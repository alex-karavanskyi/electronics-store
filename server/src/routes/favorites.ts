import { Router } from 'express'
import { z } from 'zod'
import { getSession, requireUser } from '../middleware/auth.js'
import { HttpError } from '../middleware/errors.js'
import type { FavoritesService } from '../services/favorites.js'
import {
  emptyFavoriteBodySchema,
  favoriteIdSchema,
  mergeFavoritesSchema,
  reorderFavoritesSchema,
} from '../validation/favoritesInput.js'

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) throw new HttpError(400, 'Invalid favorites request')
  return result.data
}

export function favoritesRouter(service?: FavoritesService) {
  const router = Router()
  router.use(requireUser)
  const favorites = () => {
    if (!service)
      throw new HttpError(503, 'Favorites are temporarily unavailable')
    return service
  }
  router.get('/', async (req, res) => {
    res.json(await favorites().get(getSession(req).userId))
  })
  router.post('/merge', async (req, res) => {
    const input = parse(mergeFavoritesSchema, req.body)
    res.json(await favorites().merge(getSession(req).userId, input))
  })
  router.put('/order', async (req, res) => {
    const input = parse(reorderFavoritesSchema, req.body)
    res.json(await favorites().reorder(getSession(req).userId, input))
  })
  router.put('/items/:productId', async (req, res) => {
    const id = parse(favoriteIdSchema, req.params.productId)
    parse(emptyFavoriteBodySchema, req.body ?? {})
    res.json(await favorites().add(getSession(req).userId, id))
  })
  router.delete('/items/:productId', async (req, res) => {
    const id = parse(favoriteIdSchema, req.params.productId)
    parse(emptyFavoriteBodySchema, req.body ?? {})
    res.json(await favorites().remove(getSession(req).userId, id))
  })
  return router
}
