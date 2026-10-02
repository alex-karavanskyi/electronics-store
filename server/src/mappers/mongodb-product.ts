import { z } from 'zod'
import { HttpError } from '../middleware/errors.js'
import type { Product } from '../services/products.js'

const storedProductSchema = z.object({
  _id: z
    .string()
    .min(1)
    .max(200)
    .refine(id => id.trim().length > 0),
  name: z.string(),
  price: z.number().nonnegative(),
  description: z.string().default(''),
  category: z.string().default(''),
  images: z.array(z.object({ secureUrl: z.string() })).default([]),
})

export function toProduct(value: unknown): Product {
  const result = storedProductSchema.safeParse(value)
  if (!result.success)
    throw new HttpError(502, 'Invalid product service response')
  const product = result.data
  const images = product.images.map(image => image.secureUrl)
  return {
    id: product._id,
    name: product.name,
    price: product.price,
    description: product.description,
    category: product.category,
    images,
    image: images[0] ?? '',
  }
}
