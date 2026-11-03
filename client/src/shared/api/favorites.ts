import { z } from 'zod'
import { productSchema } from '@/shared/types/productSchema'
import { fetchAuthenticatedJson } from './http'

const schema = z.object({
  ids: z
    .array(productSchema.shape.id)
    .max(500)
    .refine(ids => new Set(ids).size === ids.length),
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
})
export type AccountFavorites = z.infer<typeof schema>
export type FavoriteWrite =
  | { kind: 'add' | 'remove'; id: string }
  | { kind: 'order'; ids: string[]; revision: number }
type TokenGetter = () => Promise<string | null>

export const fetchFavorites = (token: TokenGetter, signal: AbortSignal) =>
  fetchAuthenticatedJson('/me/favorites', schema, token, signal)

export const mergeFavorites = (
  input: { batchId: string; ids: string[] },
  token: TokenGetter,
  signal: AbortSignal
) =>
  fetchAuthenticatedJson('/me/favorites/merge', schema, token, signal, {
    method: 'POST',
    body: input,
  })

export function writeFavorite(
  input: FavoriteWrite,
  token: TokenGetter,
  signal: AbortSignal
) {
  if (input.kind === 'order')
    return fetchAuthenticatedJson(
      '/me/favorites/order',
      schema,
      token,
      signal,
      { method: 'PUT', body: { ids: input.ids, revision: input.revision } }
    )
  return fetchAuthenticatedJson(
    '/me/favorites/items/' + encodeURIComponent(input.id),
    schema,
    token,
    signal,
    { method: input.kind === 'add' ? 'PUT' : 'DELETE' }
  )
}
