import { z } from 'zod'

export const MAX_FAVORITES = 500
export const favoriteIdSchema = z
  .string()
  .min(1)
  .max(200)
  .refine(id => Boolean(id.trim()) && !/^demo[_:]/.test(id))
const ids = z.array(favoriteIdSchema).max(MAX_FAVORITES)
export const mergeFavoritesSchema = z
  .object({
    batchId: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-zA-Z0-9_-]+$/),
    ids: ids.transform(values => [...new Set(values)]),
  })
  .strict()
export const reorderFavoritesSchema = z
  .object({
    ids: ids.refine(values => new Set(values).size === values.length),
    revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  })
  .strict()
export const emptyFavoriteBodySchema = z.object({}).strict()

export type MergeFavorites = z.infer<typeof mergeFavoritesSchema>
export type ReorderFavorites = z.infer<typeof reorderFavoritesSchema>
