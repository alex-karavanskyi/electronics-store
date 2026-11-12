import { randomUUID } from 'node:crypto'
import { HttpError } from '../middleware/errors.js'

export const CHAT_TIMEOUT_MS = 120_000
export const CHAT_LEASE_MS = 150_000
export type ChatAdmissionState = {
  revision: number
  requests: number[]
  leases: { id: string; expiresAt: number }[]
}
export interface ChatAdmissionStore {
  read(): Promise<ChatAdmissionState | null>
  compareAndSwap(
    revision: number | null,
    next: ChatAdmissionState
  ): Promise<boolean>
}
export interface ChatAdmission {
  acquire(): Promise<{ release(): Promise<void> } | null>
}

// All instances share one persistent document. CAS retries are bounded and
// database failures deny admission; no process-local fallback can bypass quotas.
export function createChatAdmission(
  store: ChatAdmissionStore,
  limits: { requestsPerMinute: number; maxConcurrent: number },
  clock: () => number = Date.now
): ChatAdmission {
  const unavailable = () =>
    new HttpError(503, 'Product assistant is temporarily unavailable')
  async function change(
    update: (
      state: ChatAdmissionState,
      now: number
    ) => ChatAdmissionState | null
  ): Promise<boolean> {
    try {
      for (let attempt = 0; attempt < 8; attempt++) {
        const stored = await store.read()
        const now = clock()
        const state = stored ?? { revision: 0, requests: [], leases: [] }
        const next = update(
          {
            revision: state.revision + 1,
            requests: state.requests.filter(time => time > now - 60_000),
            leases: state.leases.filter(lease => lease.expiresAt > now),
          },
          now
        )
        if (!next) return false
        if (await store.compareAndSwap(stored?.revision ?? null, next))
          return true
      }
    } catch {
      throw unavailable()
    }
    throw unavailable()
  }
  return {
    async acquire() {
      const id = randomUUID()
      const admitted = await change((state, now) => {
        if (
          state.requests.length >= limits.requestsPerMinute ||
          state.leases.length >= limits.maxConcurrent
        )
          return null
        state.requests.push(now)
        state.leases.push({ id, expiresAt: now + CHAT_LEASE_MS })
        return state
      })
      if (!admitted) return null
      return {
        async release() {
          await change(state => {
            if (!state.leases.some(lease => lease.id === id)) return null
            state.leases = state.leases.filter(lease => lease.id !== id)
            return state
          })
        },
      }
    },
  }
}
