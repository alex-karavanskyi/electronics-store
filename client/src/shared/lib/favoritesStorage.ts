import { z } from 'zod'
import { productSchema } from '@/shared/types/productSchema'
import {
  FAVORITES_STORAGE_KEY,
  FAVORITES_STORAGE_VERSION,
} from '@/shared/constants/localStorage'

const importSchema = z.object({
  userId: z.string().min(1).max(200),
  batchId: z.string().uuid(),
  ids: z.array(productSchema.shape.id),
})
export type GuestImport = z.infer<typeof importSchema>

const favoritesSchema = z.object({
  version: z.literal(FAVORITES_STORAGE_VERSION),
  ids: z.array(productSchema.shape.id),
  pendingImports: z.array(importSchema).default([]),
})

export type GuestFavorites = { ids: string[]; storageAvailable: boolean }

export function parseFavoriteIds(raw: string | null): string[] {
  try {
    const result = favoritesSchema.safeParse(
      raw === null ? null : JSON.parse(raw)
    )
    return result.success ? [...new Set(result.data.ids)] : []
  } catch {
    return []
  }
}

export function loadGuestFavorites(): GuestFavorites {
  try {
    return {
      ids: parseFavoriteIds(localStorage.getItem(FAVORITES_STORAGE_KEY)),
      storageAvailable: true,
    }
  } catch {
    return { ids: [], storageAvailable: false }
  }
}

function withStorageLock<T>(run: () => T): T | Promise<T> {
  return navigator.locks
    ? navigator.locks.request(FAVORITES_STORAGE_KEY, run)
    : run()
}

export function saveFavoriteIds(ids: string[]): boolean | Promise<boolean> {
  return withStorageLock(() => {
    try {
      const envelope = readEnvelope()
      writeEnvelope({ ...envelope, ids })
      return true
    } catch {
      return false
    }
  })
}

export function updateGuestFavorites(
  update: (ids: string[]) => string[],
  fallback: GuestFavorites
): GuestFavorites | Promise<GuestFavorites> {
  return withStorageLock(() => {
    let ids = fallback.ids
    try {
      const envelope = readEnvelope()
      ids = update(fallback.storageAvailable ? envelope.ids : fallback.ids)
      writeEnvelope({ ...envelope, ids })
      return { ids, storageAvailable: true }
    } catch {
      return {
        ids: ids === fallback.ids ? update(ids) : ids,
        storageAvailable: false,
      }
    }
  })
}

function readEnvelope(): z.infer<typeof favoritesSchema> {
  const raw = localStorage.getItem(FAVORITES_STORAGE_KEY)
  try {
    const result = favoritesSchema.safeParse(
      raw === null ? null : JSON.parse(raw)
    )
    if (result.success)
      return { ...result.data, ids: [...new Set(result.data.ids)] }
  } catch {
    /* Invalid legacy storage has the same empty fallback as guest reads. */
  }
  return { version: FAVORITES_STORAGE_VERSION, ids: [], pendingImports: [] }
}

function writeEnvelope(value: z.infer<typeof favoritesSchema>) {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(value))
}

export async function stageGuestImport(
  userId: string,
  memoryIds: string[]
): Promise<GuestImport | null> {
  if (!navigator.locks) {
    const envelope = readEnvelope()
    if (
      !envelope.ids.length &&
      !memoryIds.length &&
      !envelope.pendingImports.some(item => item.userId === userId)
    )
      return null
    throw new Error(
      'Guest import needs a browser with Web Locks on HTTPS or localhost.'
    )
  }
  return navigator.locks.request(FAVORITES_STORAGE_KEY, () => {
    const envelope = readEnvelope()
    const pending = envelope.pendingImports.find(item => item.userId === userId)
    if (pending) return pending
    const ids = [...new Set([...envelope.ids, ...memoryIds])]
    if (!ids.length) return null
    const batch = { userId, batchId: crypto.randomUUID(), ids }
    // One write both removes the public guest IDs and binds them to the account.
    // Do not send a request if this write fails.
    writeEnvelope({
      ...envelope,
      ids: [],
      pendingImports: [...envelope.pendingImports, batch],
    })
    return batch
  })
}

export async function completeGuestImport(
  userId: string,
  batchId: string
): Promise<void> {
  if (!navigator.locks) throw new Error('Guest import needs browser Web Locks.')
  await navigator.locks.request(FAVORITES_STORAGE_KEY, () => {
    const envelope = readEnvelope()
    writeEnvelope({
      ...envelope,
      pendingImports: envelope.pendingImports.filter(
        item => item.userId !== userId || item.batchId !== batchId
      ),
    })
  })
}
