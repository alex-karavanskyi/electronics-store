import assert from 'node:assert/strict'
import { test } from 'node:test'
import { database } from '../src/config/database.js'
import { getProductModel } from '../src/models/product.js'
import { createMongoProductsService } from '../src/services/mongodb-products.js'

test('create and update wait together and each executes exactly once after recovery', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const model = getProductModel(database)
  const products = createMongoProductsService()
  const actor = { userId: 'test-user', role: 'user' as const }
  const input = {
    name: 'Test',
    price: 10,
    description: '',
    category: 'Misc',
    images: [],
  }
  const lastQuery = model.findOne({})
  const updateQuery = model.findOneAndUpdate({}, {})
  t.mock.method(model, 'findOne', () => lastQuery)
  t.mock.method(lastQuery, 'exec', async () => null)
  t.mock.method(model, 'findOneAndUpdate', () => updateQuery)
  const update = t.mock.method(updateQuery, 'exec', async () => ({
    _id: 'test-product',
    ...input,
    imageUrls: [],
  }))
  const save = t.mock.method(
    model.prototype,
    'save',
    async function (this: InstanceType<typeof model>) {
      return this
    }
  )
  let state = 0
  Object.defineProperty(database, 'readyState', {
    get: () => state,
    configurable: true,
  })
  try {
    const created = products.create(input, actor)
    const updated = products.update('test-product', { price: 10 }, actor)
    await Promise.resolve()
    assert.equal(save.mock.callCount(), 0)
    assert.equal(update.mock.callCount(), 0)
    state = 1
    t.mock.timers.tick(50)
    const [first, second] = await Promise.all([created, updated])
    assert.equal(first.name, 'Test')
    assert.equal(second.id, 'test-product')
    assert.equal(save.mock.callCount(), 1)
    assert.equal(update.mock.callCount(), 1)
  } finally {
    Reflect.deleteProperty(database, 'readyState')
  }
})

// Regression: the original attempt waits and executes once after recovery.
for (const scenario of ['disconnected', 'stale-heartbeat'] as const) {
  test(`delete waits after ${scenario} and executes once after recovery`, async t => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    const model = getProductModel(database)
    const products = createMongoProductsService()
    const actor = { userId: 'test-user', role: 'user' as const }
    const query = model.deleteOne({})
    t.mock.method(model, 'deleteOne', () => query)
    const exec = t.mock.method(query, 'exec', async () => ({
      acknowledged: true,
      deletedCount: 1,
    }))
    const log = t.mock.method(console, 'error', () => {})
    const fields = ['_readyState', '_lastHeartbeatAt', 'client'] as const
    const original = fields.map(key =>
      Object.getOwnPropertyDescriptor(database, key)
    )
    const set = (key: string, value: unknown) =>
      Object.defineProperty(database, key, {
        value,
        writable: true,
        configurable: true,
      })
    try {
      set('_readyState', 1)
      set('_lastHeartbeatAt', Date.now())
      set('client', {
        topology: {
          description: { type: 'ReplicaSetWithPrimary' },
          s: { description: { heartbeatFrequencyMS: 10000 } },
        },
      })
      assert.equal(database.readyState, 1)

      // Simulate loss after initialization, or stale monitoring after suspension.
      if (scenario === 'disconnected') set('_readyState', 0)
      else set('_lastHeartbeatAt', Date.now() - 30000)
      assert.equal(database.readyState, 0)
      let completed = false
      const pending = products.remove('test-product', actor).then(() => {
        completed = true
      })
      await Promise.resolve()
      assert.equal(completed, false)
      assert.equal(
        exec.mock.callCount(),
        0,
        'driver never gets an opportunity to select a server'
      )

      set('_readyState', 1)
      set('_lastHeartbeatAt', Date.now())
      t.mock.timers.tick(50)
      await pending
      assert.equal(exec.mock.callCount(), 1)
      assert.equal(log.mock.callCount(), 0)
    } finally {
      fields.forEach((key, index) => {
        if (original[index])
          Object.defineProperty(database, key, original[index]!)
        else Reflect.deleteProperty(database, key)
      })
    }
  })
}
