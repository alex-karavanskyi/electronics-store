import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createChatAdmission,
  type ChatAdmissionStore,
  type ChatAdmissionState,
} from '../src/services/chat-admission.js'

// A shared CAS store simulates the database boundary, not the admission logic.
function sharedStore(): ChatAdmissionStore {
  let state: ChatAdmissionState | null = null
  return {
    async read() {
      return structuredClone(state)
    },
    async compareAndSwap(revision, next) {
      if ((state?.revision ?? null) !== revision) return false
      state = structuredClone(next)
      return true
    },
  }
}

test('two instances share the concurrency cap; releasing a lease does not refund rate quota', async () => {
  const store = sharedStore()
  const limits = { requestsPerMinute: 3, maxConcurrent: 2 }
  const a = createChatAdmission(store, limits)
  const b = createChatAdmission(store, limits)
  const results = await Promise.all([
    a.acquire(),
    b.acquire(),
    a.acquire(),
    b.acquire(),
  ])
  const accepted = results.filter(result => result !== null)
  assert.equal(accepted.length, 2)
  await accepted[0]!.release()
  await accepted[0]!.release() // Idempotent release cannot remove another slot.
  const third = await b.acquire()
  assert.ok(third)
  await accepted[1]!.release()
  await third.release()
  assert.equal(await a.acquire(), null)
})

test('rolling rate window expires and crashed-worker leases recover only after their deadline', async () => {
  let now = 1_000_000
  const store = sharedStore()
  const admission = createChatAdmission(
    store,
    { requestsPerMinute: 1, maxConcurrent: 1 },
    () => now
  )
  assert.ok(await admission.acquire())
  now += 60_001
  assert.equal(await admission.acquire(), null)
  now += 90_000
  assert.ok(await admission.acquire())
  const state = await store.read()
  assert.equal(state?.requests.length, 1)
  assert.equal(state?.leases.length, 1)
})

test('store errors and repeated contention fail closed without exposing internal errors', async () => {
  const limits = { requestsPerMinute: 3, maxConcurrent: 2 }
  for (const store of [
    {
      read: async () => {
        throw new Error('database-secret')
      },
      compareAndSwap: async () => false,
    },
    { read: async () => null, compareAndSwap: async () => false },
  ]) {
    await assert.rejects(
      createChatAdmission(store, limits).acquire(),
      (error: unknown) => {
        assert.ok(error instanceof Error)
        assert.match(error.message, /temporarily unavailable/)
        assert.ok(!error.message.includes('secret'))
        return true
      }
    )
  }
})
