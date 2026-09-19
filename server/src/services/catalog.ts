import { z } from 'zod'
import type { Product } from './products.js'
export function selectCatalog(products: Product[], params: URLSearchParams) {
  const price = params.get('price')?.trim()
    ? z
        .number()
        .nonnegative()
        .safeParse(Number(params.get('price')))
    : null
  const page = z
    .number()
    .int()
    .positive()
    .safeParse(Number(params.get('page')))
  const size = z
    .number()
    .int()
    .min(1)
    .max(100)
    .safeParse(Number(params.get('pageSize')))
  const sort = z
    .enum(['price-lowest', 'price-highest', 'name-a', 'name-z'])
    .catch('price-lowest')
    .parse(params.get('sort'))
  const text = (params.get('text') ?? '').toLowerCase()
  const categories = params.getAll('category').filter(Boolean)
  const selected = products
    .filter(
      product =>
        (!text || product.name.toLowerCase().startsWith(text)) &&
        (!categories.length || categories.includes(product.category)) &&
        (!price?.success || product.price <= price.data)
    )
    .sort((a, b) => {
      if (sort === 'price-lowest') return a.price - b.price
      if (sort === 'price-highest') return b.price - a.price
      if (sort === 'name-a') return a.name.localeCompare(b.name)
      return b.name.localeCompare(a.name)
    })
  const pageSize = size.success ? size.data : 6
  const effectivePage = Math.min(
    page.success ? page.data : 1,
    Math.max(1, Math.ceil(selected.length / pageSize))
  )
  return {
    items: selected.slice(
      (effectivePage - 1) * pageSize,
      effectivePage * pageSize
    ),
    total: selected.length,
    page: effectivePage,
    pageSize,
    min_price: products.length ? Math.min(...products.map(p => p.price)) : 0,
    max_price: products.length ? Math.max(...products.map(p => p.price)) : 0,
  }
}
