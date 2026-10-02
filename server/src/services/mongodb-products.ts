import { toProduct } from '../mappers/mongodb-product.js'
import { database, databaseError } from '../config/database.js'
import { getProductModel } from '../models/product.js'
import { HttpError } from '../middleware/errors.js'
import type { ProductsService } from './products.js'

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
