import { z } from 'zod'

const priceSchema = z.number().nonnegative()
const pageSchema = z.number().int().positive()
const sortSchema = z
  .enum(['price-lowest', 'price-highest', 'name-a', 'name-z'])
  .catch('price-lowest')

function normalizeCategories(categories: string[]): string[] {
  return [...new Set(categories.filter(Boolean))].sort()
}

export function parseFilters(params: URLSearchParams) {
  const priceValue = params.get('price')
  const priceResult = priceValue?.trim()
    ? priceSchema.safeParse(Number(priceValue))
    : null
  const pageResult = pageSchema.safeParse(Number(params.get('page')))

  return {
    filters: {
      text: params.get('text') ?? '',
      category: normalizeCategories(params.getAll('category')),
      price: priceResult?.success ? priceResult.data : null,
    },
    sort: sortSchema.parse(params.get('sort')),
    page: pageResult.success ? pageResult.data : 1,
  }
}

export type CatalogState = ReturnType<typeof parseFilters>
export type Sorting = CatalogState['sort']
export type CatalogRequest = CatalogState & { pageSize: number }

export function serializeFilters(
  state: CatalogState,
  current = new URLSearchParams()
) {
  const params = new URLSearchParams(current)

  for (const key of ['text', 'category', 'price', 'sort', 'page']) {
    params.delete(key)
  }

  if (state.filters.text) {
    params.set('text', state.filters.text)
  }

  for (const category of normalizeCategories(state.filters.category)) {
    params.append('category', category)
  }

  if (state.filters.price !== null) {
    params.set('price', String(state.filters.price))
  }

  if (state.sort !== 'price-lowest') {
    params.set('sort', state.sort)
  }

  if (state.page !== 1) {
    params.set('page', String(state.page))
  }

  return params
}

// The page size must be positive; an empty catalog still uses page 1.
export function clampPage(page: number, total: number, perPage: number) {
  const totalPages = Math.ceil(total / perPage)
  return Math.max(1, Math.min(page, totalPages))
}
