import { z } from 'zod'
import { fetchAuthenticatedJson, fetchJson } from './http'
import { productSchema, type ProductInput } from '@/shared/types/productSchema'
import {
  serializeFilters,
  type CatalogRequest,
} from '@/shared/filters/productFilters'

const productsSchema = z.array(productSchema)
const adminProductSchema = z.object({
  product: productSchema,
  ownerId: z.string().nullable(),
  createdAt: z.iso.datetime().nullable(),
  notification: z
    .object({
      channel: z.literal('telegram').nullable().optional(),
      status: z.enum(['pending', 'sent', 'failed']),
      attempts: z.number().int().nonnegative(),
      errorCode: z.string().nullable(),
      nextAttemptAt: z.iso.datetime().nullable(),
      leaseUntil: z.iso.datetime().nullable(),
    })
    .nullable()
    .optional(),
})
export type AdminProduct = z.infer<typeof adminProductSchema>
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

type TokenGetter = () => Promise<string | null>

export const retryProductNotification = (
  id: string,
  getToken: TokenGetter,
  signal?: AbortSignal
) =>
  fetchAuthenticatedJson(
    '/admin/products/' + encodeURIComponent(id) + '/notification/retry',
    z.object({ status: z.enum(['sent', 'deferred', 'failed', 'skipped']) }),
    getToken,
    signal,
    { method: 'POST' }
  )

export const fetchMyProducts = (getToken: TokenGetter, signal?: AbortSignal) =>
  fetchAuthenticatedJson('/me/products', productsSchema, getToken, signal)

export const fetchAdminProducts = (
  getToken: TokenGetter,
  signal?: AbortSignal
) =>
  fetchAuthenticatedJson(
    '/admin/products',
    z.array(adminProductSchema),
    getToken,
    signal
  )

export const createProduct = (input: ProductInput, getToken: TokenGetter) =>
  fetchAuthenticatedJson('/products', productSchema, getToken, undefined, {
    method: 'POST',
    body: input,
  })

export const updateProduct = (
  id: string,
  input: Partial<ProductInput>,
  getToken: TokenGetter
) =>
  fetchAuthenticatedJson(
    '/products/' + encodeURIComponent(id),
    productSchema,
    getToken,
    undefined,
    {
      method: 'PATCH',
      body: input,
    }
  )

export const deleteProduct = (id: string, getToken: TokenGetter) =>
  fetchAuthenticatedJson(
    '/products/' + encodeURIComponent(id),
    z.void(),
    getToken,
    undefined,
    {
      method: 'DELETE',
    }
  )

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
