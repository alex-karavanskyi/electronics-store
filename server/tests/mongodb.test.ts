import assert from 'node:assert/strict'
import { test } from 'node:test'
import mongoose from 'mongoose'
import { parseEnv } from '../src/config/env.js'
import { HttpError } from '../src/middleware/errors.js'

test('MongoDB is required without a source switch or Airtable credentials', () => {
  const uri = 'mongodb://127.0.0.1:27017/test'
  assert.equal(parseEnv({ MONGODB_URI: uri }).MONGODB_URI, uri)
  for (const env of [
    {},
    {
      AIRTABLE_API_KEY: 'old-secret',
      AIRTABLE_BASE_ID: 'base',
      AIRTABLE_TABLE_NAME: 'Products',
    },
    { MONGODB_URI: 'secret-invalid-uri' },
  ]) {
    assert.throws(
      () => parseEnv(env),
      error =>
        error instanceof Error &&
        error.message.includes('MONGODB_URI') &&
        !error.message.includes('secret')
    )
  }
})

test('product model preserves string IDs and permitted values, rejects invalid data', async () => {
  const { getProductModel } = await import('../src/models/product.js')
  const connection = mongoose.createConnection()
  try {
    const Product = getProductModel(connection)
    const product = new Product({ _id: ' phone / one ', name: '', price: 0 })
    await product.validate()
    assert.equal(product._id, ' phone / one ')
    assert.equal(product.description, '')
    assert.equal(product.category, '')
    assert.deepEqual(product.images.toObject(), [])
    assert.equal(product.catalogOrder, null)
    for (const invalid of [
      { _id: '' },
      { _id: ' ' },
      { _id: 'x'.repeat(201) },
      { _id: 42 },
      { name: 42 },
      { price: '1.25' },
      { description: null },
      { category: null },
      { images: null },
      { price: -1 },
      { price: Infinity },
      { catalogOrder: -1 },
      { catalogOrder: 1.5 },
    ]) {
      await assert.rejects(
        new Product({
          _id: 'rec1',
          name: 'Phone',
          price: 1.25,
          ...invalid,
        }).validate()
      )
    }
  } finally {
    await connection.close()
  }
})

test('MongoDB failures are sanitized and distinguish timeout from unavailable', async () => {
  const { databaseError } = await import('../src/config/database.js')
  for (const [error, status] of [
    [
      Object.assign(new Error('secret'), { name: 'MongoServerSelectionError' }),
      503,
    ],
    [Object.assign(new Error('secret'), { name: 'MongoNetworkError' }), 503],
    [
      Object.assign(new Error('secret'), {
        name: 'MongoOperationTimeoutError',
      }),
      504,
    ],
    [
      Object.assign(new Error('secret'), { name: 'MongoNetworkTimeoutError' }),
      504,
    ],
    [Object.assign(new Error('secret'), { code: 50 }), 504],

    [
      Object.assign(
        new Error('secret', {
          cause: Object.assign(new Error('secret host'), {
            name: 'MongoServerSelectionError',
          }),
        }),
        { name: 'MongoOperationTimeoutError' }
      ),
      503,
    ],
  ] as const) {
    const result = databaseError(error)
    assert.ok(result instanceof HttpError)
    assert.equal(result.status, status)
    assert.ok(!result.message.includes('secret'))
  }
})
