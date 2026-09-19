import { z } from 'zod'
import type { Config } from '../config/env.js'
import { HttpError } from '../middleware/errors.js'
const recordSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(200)
    .refine(id => id.trim().length > 0),
  fields: z.object({
    name: z.string(),
    price: z.number().nonnegative(),
    description: z.string().default(''),
    category: z.string().default(''),
    images: z.string().optional(),
  }),
})
function toProduct(value: unknown) {
  const { id, fields } = recordSchema.parse(value)
  const images = z
    .array(z.string())
    .parse(fields.images ? JSON.parse(fields.images) : [])
  return {
    id,
    name: fields.name,
    price: fields.price,
    description: fields.description,
    category: fields.category,
    images,
    image: images[0] ?? '',
  }
}
export type Product = ReturnType<typeof toProduct>
export function createProductsService(
  config: Config,
  upstream: typeof fetch = fetch
) {
  const base =
    'https://api.airtable.com/v0/' +
    encodeURIComponent(config.AIRTABLE_BASE_ID) +
    '/' +
    encodeURIComponent(config.AIRTABLE_TABLE_NAME)
  async function request(
    url: URL,
    detail: boolean,
    signal?: AbortSignal
  ): Promise<unknown> {
    try {
      const timeout = AbortSignal.timeout(15000)
      const response = await upstream(url, {
        headers: { Authorization: 'Bearer ' + config.AIRTABLE_API_KEY },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      })
      if (response.status === 404 && detail)
        throw new HttpError(404, 'Product not found')
      if (response.status === 429)
        throw new HttpError(503, 'Product service temporarily unavailable')
      if (!response.ok) throw new HttpError(502, 'Product service failed')
      return await response.json()
    } catch (error) {
      if (error instanceof HttpError) throw error
      if (error instanceof Error && error.name === 'TimeoutError')
        throw new HttpError(504, 'Product service timed out')
      throw new HttpError(502, 'Product service unavailable')
    }
  }
  return {
    async list(signal?: AbortSignal) {
      const url = new URL(base)
      url.search = new URLSearchParams({
        view: 'Grid view',
        maxRecords: '28',
        'sort[0][field]': 'name',
        'sort[0][direction]': 'asc',
      }).toString()
      const data = await request(url, false, signal)
      try {
        return z
          .object({ records: z.array(z.unknown()) })
          .parse(data)
          .records.map(toProduct)
      } catch {
        throw new HttpError(502, 'Invalid product service response')
      }
    },
    async get(id: string, signal?: AbortSignal) {
      if (!id.trim() || id.length > 200)
        throw new HttpError(400, 'Invalid product ID')
      const data = await request(
        new URL(base + '/' + encodeURIComponent(id)),
        true,
        signal
      )
      try {
        return toProduct(data)
      } catch {
        throw new HttpError(502, 'Invalid product service response')
      }
    },
  }
}
export type ProductsService = ReturnType<typeof createProductsService>
