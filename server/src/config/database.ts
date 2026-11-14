import { createConnection } from 'mongoose'
import { HttpError } from '../middleware/errors.js'

export const database = createConnection()
let connectionPromise: Promise<void> | undefined

export type DatabaseOperation =
  | 'database.connect'
  | 'product.create'
  | 'product.update'
  | 'product.delete'
  | 'product.exists'
  | 'product.home'
  | 'product.catalog'
  | 'product.listForAdmin'
  | 'product.listOwned'
  | 'product.list'
  | 'product.get'

function failureCategory(error: unknown): string {
  const name = error instanceof Error ? error.name : ''
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? error.code
      : undefined
  if (code === 18) return 'authentication'
  if (code === 13) return 'authorization'
  if (code === 11000) return 'conflict'
  if (
    typeof code === 'string' &&
    ['ENOTFOUND', 'EAI_AGAIN', 'ESERVFAIL'].includes(code)
  )
    return 'dns'
  if (['MongoParseError', 'MongoInvalidArgumentError'].includes(name))
    return 'configuration'
  if (
    ['MongoServerSelectionError', 'MongooseServerSelectionError'].includes(
      name
    ) ||
    (error instanceof Error &&
      error.cause instanceof Error &&
      error.cause.name === 'MongoServerSelectionError')
  )
    return 'server-selection'
  if (
    code === 50 ||
    [
      'TimeoutError',
      'MongoOperationTimeoutError',
      'MongoNetworkTimeoutError',
    ].includes(name)
  )
    return 'timeout'
  if (name === 'MongoNetworkError') return 'network'
  if (['ValidationError', 'CastError'].includes(name)) return 'validation'
  if (error instanceof HttpError && error.status === 503)
    return 'connection-not-ready'
  return 'unknown'
}

// Only controlled labels and timing are logged. Never serialize errors, causes,
// stack traces, query filters, documents, credentials or connection strings.
export function logDatabaseFailure(
  error: unknown,
  operation: DatabaseOperation,
  startedAt: number,
  state: number = database.readyState
) {
  console.error('MongoDB operation failed', {
    operation,
    connection:
      ['disconnected', 'connected', 'connecting', 'disconnecting'][state] ??
      'unknown',
    category: failureCategory(error),
    durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
  })
}

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
    const startedAt = performance.now()
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
        logDatabaseFailure(error, 'database.connect', startedAt)
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
