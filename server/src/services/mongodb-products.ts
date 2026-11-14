import { toProduct } from '../mappers/mongodb-product.js'
import { randomUUID } from 'node:crypto'
import {
  database,
  databaseError,
  logDatabaseFailure,
  type DatabaseOperation,
} from '../config/database.js'
import { getProductModel } from '../models/product.js'
import { waitForDatabase } from '../config/database-ready.js'
import { HttpError } from '../middleware/errors.js'
import { readMongoCatalog } from './mongodb-catalog.js'
import { readMongoHome } from './mongodb-home.js'
import type {
  ProductsService,
  CatalogProductsService,
  HomeProductsService,
  ProductWrites,
  ProductActor,
  OwnedProductsService,
  AdminProductsService,
} from './products.js'
import {
  createProductSchema,
  updateProductSchema,
  productWriteIdSchema,
  parseProductInput,
} from '../validation/productInput.js'

export function createMongoProductsService({
  notificationsConfigured = false,
}: { notificationsConfigured?: boolean } = {}): ProductsService &
  CatalogProductsService &
  HomeProductsService &
  ProductWrites &
  OwnedProductsService &
  AdminProductsService {
  const ProductModel = getProductModel(database)
  const options = { timeoutMS: 15000, maxTimeMS: 15000 }
  async function request<T>(
    name: DatabaseOperation,
    operation: () => Promise<T>,
    signal?: AbortSignal
  ): Promise<T> {
    const startedAt = performance.now()
    let phase: 'readiness' | 'operation' = 'readiness'
    try {
      await waitForDatabase(signal)
      signal?.throwIfAborted()
      phase = 'operation'
      return await operation()
    } catch (error) {
      if (signal?.aborted) throw signal.reason
      if (
        !signal?.aborted &&
        !(error instanceof HttpError && error.status < 500)
      )
        logDatabaseFailure(error, name, startedAt, database.readyState, phase)
      throw databaseError(error)
    }
  }
  const writeFilter = (id: string, actor: ProductActor) =>
    actor.role === 'admin' ? { _id: id } : { _id: id, ownerId: actor.userId }
  async function deniedOrMissing(id: string): Promise<never> {
    const exists = await request('product.exists', () =>
      ProductModel.exists({ _id: id }).setOptions(options).exec()
    )
    if (exists)
      throw new HttpError(403, 'You can only manage your own products')
    throw new HttpError(404, 'Product not found')
  }
  return {
    home(signal) {
      return request(
        'product.home',
        () => readMongoHome(ProductModel, signal),
        signal
      )
    },
    catalog(params, signal) {
      return request(
        'product.catalog',
        () => readMongoCatalog(ProductModel, params, signal),
        signal
      )
    },
    async listForAdmin(signal) {
      const records = await request(
        'product.listForAdmin',
        () =>
          ProductModel.find({})
            .sort({ createdAt: -1, _id: 1 })
            .setOptions({ ...options, signal })
            .lean()
            .exec(),
        signal
      )
      return records.map(record => ({
        product: toProduct(record),
        ownerId: record.ownerId ?? null,
        notification: record.notification
          ? {
              channel: record.notification.channel ?? null,
              status: record.notification.status,
              attempts: record.notification.attempts,
              errorCode: record.notification.errorCode ?? null,
              nextAttemptAt:
                record.notification.nextAttemptAt?.toISOString() ?? null,
              leaseUntil: record.notification.leaseUntil?.toISOString() ?? null,
            }
          : null,
        createdAt:
          record.createdAt instanceof Date &&
          Number.isFinite(record.createdAt.getTime())
            ? record.createdAt.toISOString()
            : null,
      }))
    },
    async create(input, actor) {
      const { images, ...fields } = parseProductInput(
        createProductSchema,
        input
      )
      const record = await request('product.create', async () => {
        const last = await ProductModel.findOne({ catalogOrder: { $gte: 0 } })
          .sort({ catalogOrder: -1 })
          .select('catalogOrder')
          .setOptions(options)
          .lean()
          .exec()
        const catalogOrder = (last?.catalogOrder ?? -1) + 1
        if (!Number.isSafeInteger(catalogOrder))
          throw new HttpError(409, 'Catalog order limit reached')
        const id = 'prod_' + randomUUID()
        const now = new Date()
        const product = new ProductModel({
          ...fields,
          _id: id,
          ownerId: actor.userId,
          imageUrls: images,
          catalogOrder,
          notification: {
            channel: 'telegram',
            status: notificationsConfigured ? 'pending' : 'failed',
            attempts: 0,
            nextAttemptAt: now,
            ...(notificationsConfigured ? {} : { errorCode: 'configuration' }),
            snapshot: {
              id,
              name: fields.name,
              price: fields.price,
              ownerId: actor.userId,
              createdAt: now.toISOString(),
            },
          },
        })
        await product.save({ wtimeout: 15000 })
        return product.toObject()
      })
      return toProduct(record)
    },
    async update(id, input, actor) {
      parseProductInput(productWriteIdSchema, id)
      const { images, ...fields } = parseProductInput(
        updateProductSchema,
        input
      )
      const record = await request('product.update', () =>
        ProductModel.findOneAndUpdate(
          writeFilter(id, actor),
          {
            $set: {
              ...fields,
              ...(images === undefined ? {} : { imageUrls: images }),
            },
          },
          {
            ...options,
            runValidators: true,
            returnDocument: 'after',
            upsert: false,
          }
        )
          .lean()
          .exec()
      )
      if (!record) return deniedOrMissing(id)
      return toProduct(record)
    },
    async remove(id, actor) {
      parseProductInput(productWriteIdSchema, id)
      const result = await request('product.delete', () =>
        ProductModel.deleteOne(writeFilter(id, actor))
          .setOptions(options)
          .exec()
      )
      if (!result.deletedCount) return deniedOrMissing(id)
    },
    async listOwned(userId, signal) {
      const records = await request(
        'product.listOwned',
        () =>
          ProductModel.find({ ownerId: userId })
            .sort({ catalogOrder: 1, _id: 1 })
            .setOptions({ ...options, signal })
            .lean()
            .exec(),
        signal
      )
      return records.map(toProduct)
    },
    async list(signal) {
      const records = await request(
        'product.list',
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
        'product.get',
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
