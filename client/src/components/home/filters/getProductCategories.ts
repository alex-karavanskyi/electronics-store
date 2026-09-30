import type { Product } from '@/shared/types/productSchema'

export function getProductCategories(products: readonly Product[]): string[] {
  return [...new Set(products.map(product => product.category))]
}
