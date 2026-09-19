import { z } from 'zod'
import { fetchJson } from './http'
import { productSchema } from '@/shared/types/productSchema'
import {
  serializeFilters,
  type CatalogRequest,
} from '@/shared/filters/productFilters'

const productsSchema = z.array(productSchema)
const catalogSchema = z
  .object({
    items: productsSchema,
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().min(1).max(100),
    min_price: z.number().nonnegative(),
    max_price: z.number().nonnegative(),
  })
  .refine(data => data.min_price <= data.max_price)

export type CatalogResponse = z.infer<typeof catalogSchema>

export const fetchProducts = (signal?: AbortSignal) =>
  fetchJson('/products', productsSchema, signal)

export const fetchProduct = (id: string, signal?: AbortSignal) =>
  fetchJson('/products/' + encodeURIComponent(id), productSchema, signal)

export function fetchCatalog(
  request: CatalogRequest,
  signal?: AbortSignal
): Promise<CatalogResponse> {
  const params = serializeFilters(request)
  params.set('pageSize', String(request.pageSize))
  return fetchJson(
    '/products/catalog?' + params.toString(),
    catalogSchema,
    signal
  )
}
