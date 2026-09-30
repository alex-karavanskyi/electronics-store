import { z } from 'zod'
import { database, databaseError } from '../config/database.js'
import { getProductModel } from '../models/product.js'
import { HttpError } from '../middleware/errors.js'
import type { Product, ProductsService } from './products.js'

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

function toProduct(value: unknown): Product {
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

export function createMongoProductsService(): ProductsService {
  const ProductModel = getProductModel(database)
  async function request<T>(
    operation: () => Promise<T>,
    signal?: AbortSignal
  ): Promise<T> {
    try {
      signal?.throwIfAborted()
      if (database.readyState !== 1)
        throw new HttpError(503, 'Product service temporarily unavailable')
      return await operation()
    } catch (error) {
      throw databaseError(error)
    }
  }
  return {
    async list(signal) {
      const records = await request(
        () =>
          ProductModel.find({ catalogOrder: { $gte: 0 } })
            .sort({ catalogOrder: 1, _id: 1 })
            .setOptions({ signal, timeoutMS: 15000, maxTimeMS: 15000 })
            .lean()
            .exec(),
        signal
      )
      return records.map(toProduct)
    },
    async get(id, signal) {
      if (!id.trim() || id.length > 200)
        throw new HttpError(400, 'Invalid product ID')
      const record = await request(
        () =>
          ProductModel.findById(id)
            .setOptions({ signal, timeoutMS: 15000, maxTimeMS: 15000 })
            .lean()
            .exec(),
        signal
      )
      if (!record) throw new HttpError(404, 'Product not found')
      return toProduct(record)
    },
  }
}
