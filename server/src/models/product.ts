import { Schema, type Connection, type InferSchemaType } from 'mongoose'

const imageSchema = new Schema(
  {
    publicId: { type: String, cast: false, required: true },
    assetId: { type: String, cast: false, required: true },
    secureUrl: { type: String, cast: false, required: true },
    width: {
      type: Number,
      cast: false,
      required: true,
      min: 1,
      validate: Number.isInteger,
    },
    height: {
      type: Number,
      cast: false,
      required: true,
      min: 1,
      validate: Number.isInteger,
    },
    format: { type: String, cast: false, required: true },
    bytes: {
      type: Number,
      cast: false,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    checksum: { type: String, cast: false, required: true },
  },
  { _id: false }
)

const productSchema = new Schema(
  {
    _id: {
      type: String,
      cast: false,
      required: true,
      maxlength: 200,
      validate: (value: string) => value.trim().length > 0,
    },
    name: { type: String, cast: false, required: true },
    price: {
      type: Number,
      cast: false,
      required: true,
      min: 0,
      validate: Number.isFinite,
    },
    description: {
      type: String,
      cast: false,
      default: '',
      validate: (value: unknown) => typeof value === 'string',
    },
    category: {
      type: String,
      cast: false,
      default: '',
      validate: (value: unknown) => typeof value === 'string',
    },
    images: { type: [imageSchema], default: [], required: true },
    catalogOrder: {
      type: Number,
      cast: false,
      default: null,
      min: 0,
      validate: (value: number | null) =>
        value === null || Number.isInteger(value),
    },
    source: { type: String, cast: false, enum: ['airtable'] },
    sourceHash: String,
    sourceNamespace: { type: String, cast: false, match: /^[a-f0-9]{64}$/ },
    importHash: { type: String, cast: false, match: /^[a-f0-9]{64}$/ },
    importedAt: Date,
  },
  { collection: 'products', timestamps: true, bufferCommands: false }
)

Object.assign(productSchema.path('name'), {
  checkRequired: (value: unknown) => typeof value === 'string',
})
productSchema.index({ catalogOrder: 1 })

export type StoredProduct = InferSchemaType<typeof productSchema>
export function getProductModel(connection: Connection) {
  return connection.models.Product
    ? connection.model<StoredProduct>('Product')
    : connection.model<StoredProduct>('Product', productSchema)
}
