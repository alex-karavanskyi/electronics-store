import { z } from 'zod'
import { productSchema } from '@/shared/types/productSchema'
import { CartItem } from '@/redux/features/cartSlice'
import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION,
} from '@/shared/constants/localStorage'
const cartSchema = z.object({
  version: z.literal(CART_STORAGE_VERSION),
  items: z
    .array(
      z.object({
        product: productSchema,
        quantity: z.number().int().positive(),
      })
    )
    .refine(
      items => new Set(items.map(item => item.product.id)).size === items.length
    ),
})
export function loadCartFromStorage(): CartItem[] {
  try {
    if (typeof window === 'undefined') return []
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    const result = cartSchema.safeParse(raw === null ? null : JSON.parse(raw))
    return result.success ? result.data.items : []
  } catch {
    return []
  }
}
