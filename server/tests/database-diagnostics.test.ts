import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as diagnostics from '../src/config/database.js'
import { createMongoProductsService } from '../src/services/mongodb-products.js'
import { getProductModel } from '../src/models/product.js'

test('connected delete failures are logged once and successful deletes stay quiet', async t => {
  const log = t.mock.method(console, 'error', () => {})
  const model = getProductModel(diagnostics.database)
  Object.defineProperty(diagnostics.database, 'readyState', {
    value: 1,
    configurable: true,
  })
  try {
    const query = model.deleteOne({})
    t.mock.method(model, 'deleteOne', () => query)
    const exec = t.mock.method(query, 'exec', async () => {
      throw Object.assign(new Error('private-host'), {
        name: 'MongoNetworkError',
      })
    })
    const products = createMongoProductsService()
    const actor = { userId: 'private-user', role: 'user' as const }
    await assert.rejects(products.remove('private-id', actor), { status: 503 })
    assert.equal(log.mock.callCount(), 1)
    assert.equal(log.mock.calls[0].arguments[1].category, 'network')
    assert.equal(log.mock.calls[0].arguments[1].connection, 'connected')
    assert.ok(!JSON.stringify(log.mock.calls[0].arguments).includes('private-'))
    exec.mock.mockImplementation(async () => ({
      acknowledged: true,
      deletedCount: 1,
    }))
    await products.remove('private-id', actor)
    assert.equal(log.mock.callCount(), 1)
  } finally {
    Reflect.deleteProperty(diagnostics.database, 'readyState')
  }
})

test('cancelled product reads do not emit database failure diagnostics', async t => {
  const log = t.mock.method(console, 'error', () => {})
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(createMongoProductsService().list(controller.signal))
  assert.equal(log.mock.callCount(), 0)
})

test('disconnected product writes log operation and state without product or user data', async t => {
  const log = t.mock.method(console, 'error', () => {})
  const products = createMongoProductsService()
  const actor = { userId: 'private-user', role: 'user' as const }
  for (const [operation, run] of [
    [
      'product.create',
      () =>
        products.create(
          {
            name: 'private-product',
            price: 1,
            description: '',
            category: 'Misc',
            images: [],
          },
          actor
        ),
    ],
    [
      'product.update',
      () => products.update('private-id', { price: 2 }, actor),
    ],
    ['product.delete', () => products.remove('private-id', actor)],
  ] as const) {
    await assert.rejects(run(), { status: 503 })
    const call = log.mock.calls.at(-1)
    assert.ok(call, 'failure must emit a diagnostic')
    assert.equal(call.arguments[0], 'MongoDB operation failed')
    const metadata = call.arguments[1]
    assert.equal(metadata.operation, operation)
    assert.equal(metadata.connection, 'disconnected')
    assert.equal(metadata.category, 'connection-not-ready')
    assert.ok(Number.isFinite(metadata.durationMs) && metadata.durationMs >= 0)
    assert.ok(!JSON.stringify(call.arguments).includes('private-'))
  }
  assert.equal(log.mock.callCount(), 3)
})

test('database diagnostics allowlist metadata and never serialize raw errors', t => {
  const log = t.mock.method(console, 'error', () => {})
  for (const [name, code, category] of [
    ['MongoNetworkError', undefined, 'network'],
    ['MongoOperationTimeoutError', undefined, 'timeout'],
    ['MongoServerError', 18, 'authentication'],
    ['MongoServerError', 13, 'authorization'],
    ['MongoServerError', 11000, 'conflict'],
    ['MongoServerSelectionError', undefined, 'server-selection'],
    ['ValidationError', undefined, 'validation'],
    ['private-name', 'private-code', 'unknown'],
  ] as const) {
    const error = Object.assign(new Error('private-uri private-token'), {
      name,
      code,
      keyValue: { name: 'private-product' },
      cause: new Error('private-host'),
    })
    diagnostics.logDatabaseFailure(
      error,
      'product.delete',
      performance.now(),
      1
    )
    const call = log.mock.calls.at(-1)!
    assert.equal(call.arguments[1].category, category)
    assert.equal(call.arguments[1].connection, 'connected')
    assert.deepEqual(Object.keys(call.arguments[1]).sort(), [
      'category',
      'connection',
      'durationMs',
      'operation',
    ])
    assert.ok(!JSON.stringify(call.arguments).includes('private-'))
  }
})
