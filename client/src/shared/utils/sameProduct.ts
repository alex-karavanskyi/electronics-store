import type { Product } from '@/shared/types/productSchema'

export function sameProduct(a: Product, b: Product): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.price === b.price &&
    a.description === b.description &&
    a.category === b.category &&
    a.image === b.image &&
    a.images.length === b.images.length &&
    a.images.every((image, index) => image === b.images[index])
  )
}
