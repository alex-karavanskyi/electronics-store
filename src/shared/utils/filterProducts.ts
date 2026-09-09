import { Product, ProductFilters } from '@/shared/types/productsType'

export const getPriceBounds = (products: Product[]) => {
  if (!products.length) return { min_price: 0, max_price: 0 }
  return products.reduce(
    (bounds, product) => ({
      min_price: Math.min(bounds.min_price, product.price),
      max_price: Math.max(bounds.max_price, product.price),
    }),
    { min_price: products[0].price, max_price: products[0].price }
  )
}

export const filterProducts = (
  products: Product[],
  filters: ProductFilters,
  sort: string
) =>
  products
    .filter(
      product =>
        (!filters.text ||
          product.name.toLowerCase().startsWith(filters.text.toLowerCase())) &&
        (!filters.category.length ||
          filters.category.includes(product.category)) &&
        (filters.price === null || product.price <= filters.price)
    )
    .sort((a, b) => {
      if (sort === 'price-lowest') return a.price - b.price
      if (sort === 'price-highest') return b.price - a.price
      if (sort === 'name-a') return a.name.localeCompare(b.name)
      if (sort === 'name-z') return b.name.localeCompare(a.name)
      return 0
    })
