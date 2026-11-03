import { Schema, type Connection, type InferSchemaType } from 'mongoose'
import {
  favoriteIdSchema,
  MAX_FAVORITES,
} from '../validation/favoritesInput.js'

const schema = new Schema(
  {
    _id: { type: String, required: true, cast: false, maxlength: 200 },
    productIds: {
      type: [String],
      required: true,
      default: [],
      validate: (ids: string[]) =>
        ids.length <= MAX_FAVORITES &&
        new Set(ids).size === ids.length &&
        ids.every(id => favoriteIdSchema.safeParse(id).success),
    },
    revision: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: Number.isSafeInteger,
    },
    processedMergeIds: {
      type: [String],
      required: true,
      default: [],
      validate: (ids: string[]) =>
        ids.length <= 10000 && new Set(ids).size === ids.length,
    },
  },
  { collection: 'favorites', timestamps: true, bufferCommands: false }
)

export type StoredFavorites = InferSchemaType<typeof schema>
export function getFavoritesModel(connection: Connection) {
  return connection.models.Favorites
    ? connection.model<StoredFavorites>('Favorites')
    : connection.model<StoredFavorites>('Favorites', schema)
}
