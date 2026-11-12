import { Schema, type Connection } from 'mongoose'
import { database } from '../config/database.js'
import {
  createChatAdmission,
  type ChatAdmissionState,
  type ChatAdmissionStore,
} from './chat-admission.js'

const schema = new Schema(
  {
    _id: { type: String, required: true },
    revision: { type: Number, required: true },
    requests: { type: [Number], required: true },
    leases: {
      type: [
        new Schema(
          {
            id: { type: String, required: true },
            expiresAt: { type: Number, required: true },
          },
          { _id: false }
        ),
      ],
      required: true,
    },
  },
  { collection: 'chat_admission', bufferCommands: false, versionKey: false }
)

export function createMongoChatAdmission(
  limits: { requestsPerMinute: number; maxConcurrent: number },
  connection: Connection = database
) {
  const Model = connection.models.ChatAdmission
    ? connection.model<ChatAdmissionState & { _id: string }>('ChatAdmission')
    : connection.model<ChatAdmissionState & { _id: string }>(
        'ChatAdmission',
        schema
      )
  const options = { timeoutMS: 5000, maxTimeMS: 5000 }
  const store: ChatAdmissionStore = {
    read: () => Model.findById('global').setOptions(options).lean().exec(),
    async compareAndSwap(revision, next) {
      try {
        const result = await Model.updateOne(
          {
            _id: 'global',
            ...(revision === null
              ? { revision: { $exists: false } }
              : { revision }),
          },
          { $set: next },
          { ...options, upsert: revision === null }
        ).exec()
        return result.modifiedCount === 1 || result.upsertedCount === 1
      } catch (error) {
        // Simultaneous first admissions race on MongoDB's unique _id index.
        if (
          revision === null &&
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 11000
        )
          return false
        throw error
      }
    },
  }
  return createChatAdmission(store, limits)
}
