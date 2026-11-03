import type { Connection } from 'mongoose'
import { database, databaseError } from '../config/database.js'
import { getFavoritesModel } from '../models/favorites.js'
import { getProductModel } from '../models/product.js'
import { HttpError } from '../middleware/errors.js'
import type { Favorites, FavoritesService } from './favorites.js'
import {
  favoriteIdSchema,
  MAX_FAVORITES,
  mergeFavoritesSchema,
  reorderFavoritesSchema,
  type MergeFavorites,
  type ReorderFavorites,
} from '../validation/favoritesInput.js'

type Command =
  | { kind: 'get' }
  | { kind: 'add' | 'remove'; id: string }
  | { kind: 'merge'; input: MergeFavorites }
  | { kind: 'reorder'; input: ReorderFavorites }
const options = { timeoutMS: 15000, maxTimeMS: 15000 }
const conflict = () =>
  new HttpError(
    409,
    'Favorites changed on another device. Reload and try again.'
  )

export function createMongoFavoritesService(
  connection: Connection = database
): FavoritesService {
  const Favorite = getFavoritesModel(connection)
  const Product = getProductModel(connection)

  async function execute(userId: string, command: Command): Promise<Favorites> {
    try {
      if (connection.readyState !== 1)
        throw new HttpError(503, 'Favorites are temporarily unavailable')
      if (!userId.trim() || userId.length > 200)
        throw new HttpError(400, 'Invalid user ID')
      if (
        (command.kind === 'add' || command.kind === 'remove') &&
        !favoriteIdSchema.safeParse(command.id).success
      )
        throw new HttpError(400, 'Invalid product ID')
      if (command.kind === 'merge') {
        const parsed = mergeFavoritesSchema.safeParse(command.input)
        if (!parsed.success) throw new HttpError(400, 'Invalid merge request')
        command = { kind: 'merge', input: parsed.data }
      }
      if (
        command.kind === 'reorder' &&
        !reorderFavoritesSchema.safeParse(command.input).success
      )
        throw new HttpError(400, 'Invalid order request')

      for (let attempt = 0; attempt < 8; attempt++) {
        const stored = await Favorite.findById(userId)
          .setOptions(options)
          .lean()
          .exec()
        const previous = stored?.productIds ?? []
        const revision = stored?.revision ?? 0
        const receipts = stored?.processedMergeIds ?? []
        const alreadyMerged =
          command.kind === 'merge' && receipts.includes(command.input.batchId)
        const incoming =
          command.kind === 'add'
            ? [command.id]
            : command.kind === 'merge' && !alreadyMerged
              ? command.input.ids
              : []
        const candidates = [...new Set([...previous, ...incoming])]
        const existing = candidates.length
          ? await Product.find({ _id: { $in: candidates } })
              .select('_id')
              .setOptions(options)
              .lean()
              .exec()
          : []
        const existingIds = new Set(existing.map(product => product._id))
        let ids = previous.filter(id => existingIds.has(id))
        let nextReceipts = receipts

        if (command.kind === 'add') {
          if (!existingIds.has(command.id))
            throw new HttpError(404, 'Product not found')
          if (!ids.includes(command.id)) ids = [...ids, command.id]
        } else if (command.kind === 'remove') {
          const removedId = command.id
          ids = ids.filter(id => id !== removedId)
        } else if (command.kind === 'merge' && !alreadyMerged) {
          if (receipts.length >= 10000)
            throw new HttpError(409, 'Favorites import limit reached')
          ids = [
            ...new Set([...ids, ...incoming.filter(id => existingIds.has(id))]),
          ]
          nextReceipts = [...receipts, command.input.batchId]
        } else if (command.kind === 'reorder') {
          if (
            revision !== command.input.revision ||
            ids.length !== command.input.ids.length ||
            command.input.ids.some(id => !ids.includes(id))
          )
            throw conflict()
          ids = command.input.ids
        }
        if (ids.length > MAX_FAVORITES)
          throw new HttpError(
            409,
            'A wishlist can contain at most 500 products'
          )
        const changed =
          ids.length !== previous.length ||
          ids.some((id, index) => id !== previous[index]) ||
          nextReceipts !== receipts
        if (!changed) return { ids, revision }

        try {
          const updated = await Favorite.findOneAndUpdate(
            { _id: userId, revision },
            {
              $set: {
                productIds: ids,
                processedMergeIds: nextReceipts,
                revision: revision + 1,
              },
            },
            {
              ...options,
              upsert: !stored,
              returnDocument: 'after',
              runValidators: true,
            }
          )
            .lean()
            .exec()
          if (updated)
            return { ids: updated.productIds, revision: updated.revision }
        } catch (error) {
          // Two first writes can race to create the unique Clerk-ID document.
          // Retry the whole operation against the winner; never reuse a stale union.
          if (
            !stored &&
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 11000
          )
            continue
          throw error
        }
        if (command.kind === 'reorder') throw conflict()
      }
      throw conflict()
    } catch (error) {
      throw databaseError(error)
    }
  }

  return {
    get: userId => execute(userId, { kind: 'get' }),
    add: (userId, id) => execute(userId, { kind: 'add', id }),
    remove: (userId, id) => execute(userId, { kind: 'remove', id }),
    merge: (userId, input) => execute(userId, { kind: 'merge', input }),
    reorder: (userId, input) => execute(userId, { kind: 'reorder', input }),
  }
}
