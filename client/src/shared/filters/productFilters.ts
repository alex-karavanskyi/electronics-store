import { z } from 'zod'
import {
  createLoader,
  createMultiParser,
  createParser,
  createSerializer,
  parseAsString,
  parseAsStringLiteral,
} from 'nuqs/server'

const priceSchema = z.number().nonnegative()
const pageSchema = z.number().int().positive()
const sortingValues = [
  'price-lowest',
  'price-highest',
  'name-a',
  'name-z',
] as const
export const sortSchema = z.enum(sortingValues).catch('price-lowest')

function normalizeCategories(categories: readonly string[]): string[] {
  return [...new Set(categories.filter(Boolean))].sort()
}

const priceParser = createParser({
  parse: raw => {
    if (!raw.trim()) return null
    const result = priceSchema.safeParse(Number(raw))
    return result.success ? result.data : null
  },
  serialize: String,
})

export const catalogParsers = {
  text: parseAsString.withDefault(''),
  category: createMultiParser({
    parse: normalizeCategories,
    serialize: normalizeCategories,
    eq: (a, b) =>
      a.length === b.length && a.every((value, index) => value === b[index]),
  }).withDefault([]),
  price: priceParser,
  minPrice: priceParser,
  sort: parseAsStringLiteral(sortingValues).withDefault('price-lowest'),
  page: createParser({
    parse: raw => {
      const result = pageSchema.safeParse(Number(raw))
      return result.success ? result.data : null
    },
    serialize: String,
  }).withDefault(1),
}

const loadFilters = createLoader(catalogParsers)
const writeFilters = createSerializer(catalogParsers)

export function parseFilters(params: URLSearchParams) {
  const { sort, page, ...filters } = loadFilters(params)
  return { filters, sort, page }
}

export type CatalogState = ReturnType<typeof parseFilters>
export type Sorting = CatalogState['sort']
export type CatalogRequest = CatalogState & { pageSize: number }

export function serializeFilters(
  state: CatalogState,
  current = new URLSearchParams()
) {
  return new URLSearchParams(
    writeFilters(current, {
      ...state.filters,
      sort: state.sort,
      page: state.page,
    })
  )
}

// The page size must be positive; an empty catalog still uses page 1.
export function clampPage(page: number, total: number, perPage: number) {
  const totalPages = Math.ceil(total / perPage)
  return Math.max(1, Math.min(page, totalPages))
}
