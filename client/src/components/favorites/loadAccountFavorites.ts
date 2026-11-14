import type { QueryClient } from '@tanstack/react-query'
import {
  fetchFavorites,
  mergeFavorites,
  type AccountFavorites,
} from '@/shared/api/favorites'
import {
  completeGuestImport,
  loadGuestFavorites,
  stageGuestImport,
  type GuestFavorites,
} from '@/shared/lib/favoritesStorage'
import { guestFavoritesKey } from './useGuestFavorites'

export type AccountState = AccountFavorites & {
  importError?: Error
  pendingBatchId?: string
}

type Options = {
  userId: string
  client: QueryClient
  signal: AbortSignal
  current: () => boolean
  getToken: () => Promise<string | null>
}

// Import must finish (or retain a retryable batch) before reading account data.
export async function loadAccountFavorites({
  userId,
  client,
  signal,
  current,
  getToken,
}: Options): Promise<AccountState> {
  const assertCurrent = () => {
    if (signal.aborted || !current())
      throw new DOMException('Session changed', 'AbortError')
  }
  const token = async () => {
    assertCurrent()
    const value = await getToken()
    assertCurrent()
    return value
  }
  assertCurrent()
  let pendingBatchId: string | undefined
  let importError: Error | undefined
  try {
    for (;;) {
      let batch
      try {
        const guest =
          client.getQueryData<GuestFavorites>(guestFavoritesKey) ??
          loadGuestFavorites()
        batch = await stageGuestImport(
          userId,
          guest.storageAvailable ? [] : guest.ids
        )
        assertCurrent()
        client.setQueryData(guestFavoritesKey, loadGuestFavorites())
      } catch {
        throw new Error(
          'Unable to safely transfer your guest wishlist. Allow browser storage and retry.'
        )
      }
      if (!batch) break
      pendingBatchId = batch.batchId
      await mergeFavorites(
        { batchId: batch.batchId, ids: batch.ids },
        token,
        signal
      )
      assertCurrent()
      try {
        await completeGuestImport(userId, batch.batchId)
        assertCurrent()
        pendingBatchId = undefined
      } catch {
        throw new Error(
          'Your wishlist was saved, but the transfer could not be confirmed on this device. Retry to finish.'
        )
      }
    }
  } catch (error) {
    assertCurrent()
    importError =
      error instanceof Error
        ? error
        : new Error('Unable to import guest favorites.')
  }
  const result = await fetchFavorites(token, signal)
  assertCurrent()
  return { ...result, importError, pendingBatchId }
}
