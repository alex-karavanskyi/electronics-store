import { z } from 'zod'
const sortSchema = z
  .enum(['price-lowest', 'price-highest', 'name-a', 'name-z'])
  .catch('price-lowest')
export function parseFilters(params: URLSearchParams) {
  const priceValue = params.get('price')
  const price = priceValue?.trim()
    ? z.number().nonnegative().safeParse(Number(priceValue))
    : null
  const page = z
    .number()
    .int()
    .positive()
    .safeParse(Number(params.get('page')))
  return {
    filters: {
      text: params.get('text') ?? '',
      category: [...new Set(params.getAll('category').filter(Boolean))].sort(),
      price: price?.success ? price.data : null,
    },
    sort: sortSchema.parse(params.get('sort')),
    page: page.success ? page.data : 1,
  }
}

export type CatalogFilters = ReturnType<typeof parseFilters>
export type Sorting = CatalogFilters['sort']
export function serializeFilters(
  state: CatalogFilters,
  current = new URLSearchParams()
) {
  const params = new URLSearchParams(current)
  for (const key of ['text', 'category', 'price', 'sort', 'page'])
    params.delete(key)
  if (state.filters.text) params.set('text', state.filters.text)
  for (const category of [...new Set(state.filters.category)].sort())
    if (category) params.append('category', category)
  if (state.filters.price !== null)
    params.set('price', String(state.filters.price))
  if (state.sort !== 'price-lowest') params.set('sort', state.sort)
  if (state.page !== 1) params.set('page', String(state.page))
  return params
}
export const clampPage = (page: number, total: number, perPage: number) =>
  Math.min(page, Math.max(1, Math.ceil(total / perPage)))
export type CatalogRequest = CatalogFilters & { pageSize: number }
