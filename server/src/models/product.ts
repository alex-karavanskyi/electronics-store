import { Schema, type Connection, type InferSchemaType } from 'mongoose'
import { productImagesSchema } from '../validation/productInput.js'

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

const notificationSchema = new Schema(
  {
    channel: { type: String, enum: ['telegram'] },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      required: true,
    },
    attempts: { type: Number, required: true, min: 0 },
    nextAttemptAt: Date,
    leaseToken: String,
    leaseUntil: Date,
    firstAttemptAt: Date,
    providerMessageId: String,
    errorCode: String,
    snapshot: {
      type: new Schema(
        {
          id: { type: String, required: true },
          name: { type: String, required: true },
          price: { type: Number, required: true },
          ownerId: { type: String, required: true },
          createdAt: { type: String, required: true },
        },
        { _id: false }
      ),
      required: true,
    },
    // Freeze the recipient and content before the first network request.
    payload: {
      type: new Schema(
        {
          chatId: { type: String, required: true },
          productUrl: { type: String, required: true },
          adminUrl: { type: String, required: true },
          text: { type: String, required: true },
        },
        { _id: false }
      ),
      default: undefined,
    },
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
    ownerId: {
      type: String,
      cast: false,
      immutable: true,
      validate: (value: unknown) =>
        value === undefined ||
        (typeof value === 'string' && value.trim().length > 0),
    },
    notification: { type: notificationSchema, default: undefined },
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
    // Admin gallery override. Absence preserves the imported Cloudinary gallery;
    // an empty array explicitly clears the displayed images.
    imageUrls: {
      type: [{ type: String, cast: false }],
      default: undefined,
      validate: (value: unknown) =>
        value === undefined || productImagesSchema.safeParse(value).success,
    },
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
productSchema.index(
  { 'notification.status': 1, 'notification.nextAttemptAt': 1, _id: 1 },
  { name: 'product_notification_due' }
)
productSchema.index(
  { ownerId: 1, catalogOrder: 1, _id: 1 },
  { name: 'product_owner_catalog_order' }
)

export type StoredProduct = InferSchemaType<typeof productSchema>
export function getProductModel(connection: Connection) {
  return connection.models.Product
    ? connection.model<StoredProduct>('Product')
    : connection.model<StoredProduct>('Product', productSchema)
}

// Explicit setup only: runtime connections have autoIndex disabled.
export async function prepareProductIndexes(
  connection: Connection
): Promise<void> {
  await getProductModel(connection).collection.createIndex(
    { ownerId: 1, catalogOrder: 1, _id: 1 },
    { name: 'product_owner_catalog_order' }
  )
  await getProductModel(connection).collection.createIndex(
    { 'notification.status': 1, 'notification.nextAttemptAt': 1, _id: 1 },
    { name: 'product_notification_due' }
  )
}
