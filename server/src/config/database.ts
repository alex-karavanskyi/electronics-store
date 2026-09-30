import { createConnection } from 'mongoose'
import { HttpError } from '../middleware/errors.js'

export const database = createConnection()
let connectionPromise: Promise<void> | undefined

export function databaseError(error: unknown): HttpError {
  if (error instanceof HttpError) return error
  const name = error instanceof Error ? error.name : ''
  if (
    error instanceof Error &&
    error.cause instanceof Error &&
    error.cause.name === 'MongoServerSelectionError'
  ) {
    return new HttpError(503, 'Product service temporarily unavailable')
  }
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? error.code
      : undefined
  if (
    code === 50 ||
    [
      'TimeoutError',
      'MongoOperationTimeoutError',
      'MongoNetworkTimeoutError',
    ].includes(name)
  ) {
    return new HttpError(504, 'Product service timed out')
  }
  return new HttpError(503, 'Product service temporarily unavailable')
}

// A single connection/pool is shared by all product requests in this process.
export function connectDatabase(uri: string): Promise<void> {
  if (!connectionPromise) {
    connectionPromise = database
      .openUri(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        socketTimeoutMS: 15000,
        maxPoolSize: 10,
        bufferCommands: false,
        autoIndex: false,
        autoCreate: false,
      })
      .then(() => undefined)
      .catch(async error => {
        await database.close().catch(() => undefined)
        connectionPromise = undefined
        throw databaseError(error)
      })
  }
  return connectionPromise
}

export async function disconnectDatabase() {
  try {
    await connectionPromise?.catch(() => undefined)
    await database.close()
  } finally {
    connectionPromise = undefined
  }
}
