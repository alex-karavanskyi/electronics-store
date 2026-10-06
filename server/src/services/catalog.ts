import { z } from 'zod'
import type { Product } from './products.js'

const DEFAULT_PAGE_SIZE = 6
const MAX_PAGE_SIZE = 100

const priceSchema = z.number().nonnegative()
const pageSchema = z.number().int().positive()
const pageSizeSchema = z.number().int().min(1).max(MAX_PAGE_SIZE)
const sortSchema = z
  .enum(['price-lowest', 'price-highest', 'name-a', 'name-z'])
  .catch('price-lowest')

function parseCatalogParams(params: URLSearchParams) {
  const priceValue = params.get('price')
  const priceResult = priceValue?.trim()
    ? priceSchema.safeParse(Number(priceValue))
    : null
  const pageResult = pageSchema.safeParse(Number(params.get('page')))
  const pageSizeResult = pageSizeSchema.safeParse(
    Number(params.get('pageSize'))
  )

  return {
    maxPrice: priceResult?.success ? priceResult.data : null,
    requestedPage: pageResult.success ? pageResult.data : 1,
    pageSize: pageSizeResult.success ? pageSizeResult.data : DEFAULT_PAGE_SIZE,
    sort: sortSchema.parse(params.get('sort')),
    text: (params.get('text') ?? '').toLowerCase(),
    categories: params.getAll('category').filter(Boolean),
  }
}

export function selectCatalog(products: Product[], params: URLSearchParams) {
  const { maxPrice, requestedPage, pageSize, sort, text, categories } =
    parseCatalogParams(params)

  const filteredProducts = products
    .filter(
      product =>
        (!text || product.name.toLowerCase().startsWith(text)) &&
        (!categories.length || categories.includes(product.category)) &&
        (maxPrice === null || product.price <= maxPrice)
    )
    .sort((a, b) => {
      if (sort === 'price-lowest') return a.price - b.price
      if (sort === 'price-highest') return b.price - a.price
      if (sort === 'name-a') return a.name.localeCompare(b.name)
      return b.name.localeCompare(a.name)
    })
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize))
  const effectivePage = Math.min(requestedPage, totalPages)
  const offset = (effectivePage - 1) * pageSize

  return {
    items: filteredProducts.slice(offset, offset + pageSize),
    total: filteredProducts.length,
    page: effectivePage,
    pageSize,
    // Price bounds cover the full catalog, regardless of the active filters.
    min_price: products.length ? Math.min(...products.map(p => p.price)) : 0,
    max_price: products.length ? Math.max(...products.map(p => p.price)) : 0,
  }
}
