import { database } from './database.js'
import { HttpError } from '../middleware/errors.js'

type Waiter = (error?: unknown) => void
const waiters = new Set<Waiter>()
let poll: ReturnType<typeof setTimeout> | undefined
let deadline: ReturnType<typeof setTimeout> | undefined

function cleanup() {
  clearTimeout(poll)
  clearTimeout(deadline)
  poll = undefined
  deadline = undefined
}

function finish(error?: unknown) {
  cleanup()
  for (const waiter of [...waiters]) waiter(error)
}

function check() {
  if (database.readyState === 1) finish()
  else poll = setTimeout(check, 50)
}

/**
 * Wait for the existing driver's monitoring/recovery, including heartbeat
 * freshness changes that do not emit `connected`. Does not open a new client,
 * mutate Mongoose internals, execute queries, or retry writes.
 * Concurrent callers share a five-second window; late arrivals join that window.
 */
export function waitForDatabase(signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(signal.reason)
  if (database.readyState === 1) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const settle: Waiter = error => {
      waiters.delete(settle)
      signal?.removeEventListener('abort', abort)
      if (waiters.size === 0) cleanup()
      if (error !== undefined) reject(error)
      else resolve()
    }
    const abort = () => settle(signal?.reason)
    waiters.add(settle)
    signal?.addEventListener('abort', abort, { once: true })
    if (deadline === undefined) {
      deadline = setTimeout(() => {
        finish(new HttpError(503, 'Product service temporarily unavailable'))
      }, 5000)
      poll = setTimeout(check, 50)
    }
  })
}
