import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getEventListeners } from 'node:events'
import { database } from '../src/config/database.js'
import { waitForDatabase } from '../src/config/database-ready.js'

test('healthy connection returns without scheduling timers or listeners', async t => {
  Object.defineProperty(database, 'readyState', {
    value: 1,
    configurable: true,
  })
  const timer = t.mock.method(globalThis, 'setTimeout')
  const controller = new AbortController()
  try {
    await waitForDatabase(controller.signal)
    assert.equal(timer.mock.callCount(), 0)
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0)
  } finally {
    Reflect.deleteProperty(database, 'readyState')
  }
})

test('one cancellation leaves other callers waiting; success removes listeners and polling', async t => {
  let state = 0
  let reads = 0
  Object.defineProperty(database, 'readyState', {
    get: () => {
      reads++
      return state
    },
    configurable: true,
  })
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const a = new AbortController()
  const b = new AbortController()
  try {
    const cancelled = assert.rejects(waitForDatabase(a.signal), {
      name: 'AbortError',
    })
    const survivor = waitForDatabase(b.signal)
    a.abort()
    await cancelled
    assert.equal(getEventListeners(a.signal, 'abort').length, 0)
    assert.equal(getEventListeners(b.signal, 'abort').length, 1)
    state = 1
    t.mock.timers.tick(50)
    await survivor
    assert.equal(getEventListeners(b.signal, 'abort').length, 0)
    const before = reads
    t.mock.timers.tick(10000)
    assert.equal(reads, before)
  } finally {
    Reflect.deleteProperty(database, 'readyState')
  }
})

test('late concurrent callers share the deadline and timeout releases listeners', async t => {
  Object.defineProperty(database, 'readyState', {
    value: 0,
    configurable: true,
  })
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const controllers = [new AbortController(), new AbortController()]
  try {
    const first = assert.rejects(waitForDatabase(controllers[0].signal), {
      status: 503,
    })
    t.mock.timers.tick(4000)
    const second = assert.rejects(waitForDatabase(controllers[1].signal), {
      status: 503,
    })
    t.mock.timers.tick(1000)
    await Promise.all([first, second])
    for (const controller of controllers)
      assert.equal(getEventListeners(controller.signal, 'abort').length, 0)
  } finally {
    Reflect.deleteProperty(database, 'readyState')
  }
})

test('readiness waits for state changes without requiring a connected event', async t => {
  let state = 0
  Object.defineProperty(database, 'readyState', {
    get: () => state,
    configurable: true,
  })
  t.mock.timers.enable({ apis: ['setTimeout'] })
  try {
    let completed = false
    const first = waitForDatabase().then(() => {
      completed = true
    })
    const second = waitForDatabase()
    await Promise.resolve()
    assert.equal(completed, false)
    state = 1
    t.mock.timers.tick(50)
    await Promise.all([first, second])
    assert.equal(completed, true)
    await waitForDatabase()
  } finally {
    Reflect.deleteProperty(database, 'readyState')
  }
})

test('readiness times out and a subsequent wait can recover', async t => {
  let state = 0
  Object.defineProperty(database, 'readyState', {
    get: () => state,
    configurable: true,
  })
  t.mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const failed = assert.rejects(waitForDatabase(), { status: 503 })
    t.mock.timers.tick(5000)
    await failed
    const next = waitForDatabase()
    state = 1
    t.mock.timers.tick(50)
    await next
  } finally {
    Reflect.deleteProperty(database, 'readyState')
  }
})

test('cancellation is isolated and the last cancellation clears shared waiting', async t => {
  let reads = 0
  let state = 0
  Object.defineProperty(database, 'readyState', {
    get: () => {
      reads++
      return state
    },
    configurable: true,
  })
  t.mock.timers.enable({ apis: ['setTimeout'] })
  try {
    const a = new AbortController()
    const b = new AbortController()
    const first = assert.rejects(waitForDatabase(a.signal), {
      name: 'AbortError',
    })
    const second = assert.rejects(waitForDatabase(b.signal), {
      name: 'AbortError',
    })
    a.abort()
    await first
    b.abort()
    await second
    const before = reads
    t.mock.timers.tick(10000)
    assert.equal(reads, before)
    state = 1
    await waitForDatabase()
    await assert.rejects(waitForDatabase(a.signal), { name: 'AbortError' })
  } finally {
    Reflect.deleteProperty(database, 'readyState')
  }
})
