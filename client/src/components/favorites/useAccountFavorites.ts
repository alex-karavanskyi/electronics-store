import { useEffect, useRef } from 'react'
import {
  useIsMutating,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useAccess } from '@/shared/auth/useAccess'
import {
  fetchFavorites,
  mergeFavorites,
  writeFavorite,
  type AccountFavorites,
  type FavoriteWrite,
} from '@/shared/api/favorites'
import {
  completeGuestImport,
  loadGuestFavorites,
  stageGuestImport,
  type GuestFavorites,
} from '@/shared/lib/favoritesStorage'
import { guestFavoritesKey } from './useGuestFavorites'

export const userFavoritesKey = (userId: string | null) =>
  ['favorites', 'user', userId] as const

type AccountState = AccountFavorites & {
  importError?: Error
  pendingBatchId?: string
}
type AccountWrite = FavoriteWrite | { kind: 'discard-import'; batchId: string }

export function useAccountFavorites() {
  const access = useAccess()
  const client = useQueryClient()
  const userId = access.status === 'authenticated' ? access.userId : null
  const key = userFavoritesKey(userId)
  const identity = access.status + ':' + userId
  const lifetime = useRef({ identity, generation: 0 })
  if (lifetime.current.identity !== identity)
    lifetime.current = { identity, generation: lifetime.current.generation + 1 }
  const generation = lifetime.current.generation
  const current = () =>
    lifetime.current.identity === identity &&
    lifetime.current.generation === generation
  const controllers = useRef(new Set<AbortController>())
  const saving = useIsMutating({ mutationKey: key }) > 0
  const mutations = useMutationState({
    filters: { mutationKey: key },
    select: item => ({ status: item.state.status, error: item.state.error }),
  })

  useEffect(() => {
    const active = controllers.current
    return () => {
      active.forEach(controller => controller.abort())
      active.clear()
    }
  }, [identity])

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId) && !saving,
    staleTime: 60_000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    queryFn: async ({ signal }): Promise<AccountState> => {
      const assertCurrent = () => {
        if (signal.aborted || !current())
          throw new DOMException('Session changed', 'AbortError')
      }
      const token = async () => {
        assertCurrent()
        const value = await access.getToken()
        assertCurrent()
        return value
      }
      assertCurrent()
      let pendingBatchId: string | undefined
      let importError: Error | undefined
      // One deduplicated query owns migration. A batch is saved before sending.
      try {
        for (;;) {
          let batch
          try {
            const guest =
              client.getQueryData<GuestFavorites>(guestFavoritesKey) ??
              loadGuestFavorites()
            batch = await stageGuestImport(
              userId!,
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
            await completeGuestImport(userId!, batch.batchId)
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
      // An import failure must not prevent viewing/removing existing account
      // favorites (including freeing space to retry an over-limit import).
      const result = await fetchFavorites(token, signal)
      assertCurrent()
      return { ...result, importError, pendingBatchId }
    },
  })
  type PendingWrite = {
    input: AccountWrite
    controller: AbortController
    active: () => boolean
    getToken: () => Promise<string | null>
    key: typeof key
  }
  const mutation = useMutation({
    mutationKey: key,
    scope: { id: JSON.stringify(key) },
    retry: false,
    mutationFn: async (pending: PendingWrite) => {
      const { controller } = pending
      const token = async () => {
        if (!pending.active() || controller.signal.aborted)
          throw new DOMException('Session changed', 'AbortError')
        const value = await pending.getToken()
        if (!pending.active() || controller.signal.aborted)
          throw new DOMException('Session changed', 'AbortError')
        return value
      }
      try {
        await client.cancelQueries({ queryKey: pending.key, exact: true })
        if (!pending.active() || controller.signal.aborted)
          throw new DOMException('Session changed', 'AbortError')
        if (pending.input.kind === 'discard-import') {
          await completeGuestImport(pending.key[2]!, pending.input.batchId)
          return await fetchFavorites(token, controller.signal)
        }
        const result = await writeFavorite(
          pending.input,
          token,
          controller.signal
        )
        if (!pending.active() || controller.signal.aborted)
          throw new DOMException('Session changed', 'AbortError')
        return result
      } finally {
        controllers.current.delete(controller)
      }
    },
    onSuccess: (data, pending) => {
      if (pending.active() && !pending.controller.signal.aborted)
        client.setQueryData<AccountFavorites>(pending.key, data)
    },
    onSettled: (_data, _error, pending) => {
      if (pending.active() && !pending.controller.signal.aborted)
        void client.invalidateQueries({ queryKey: pending.key, exact: true })
    },
  })

  const isReady = Boolean(
    userId && query.data && !query.error && !query.isFetching
  )
  const write = (input: AccountWrite) => {
    if (!isReady || !current() || client.isMutating({ mutationKey: key }))
      return
    const controller = new AbortController()
    controllers.current.add(controller)
    mutation.mutate({
      input,
      controller,
      active: current,
      getToken: access.getToken,
      key,
    })
  }
  const latest = mutations[mutations.length - 1]
  const mutationError = latest?.status === 'error' ? latest.error : null

  return {
    ids: userId ? (query.data?.ids ?? []) : [],
    revision: query.data?.revision ?? 0,
    isLoading: Boolean(userId && query.isPending),
    isSaving: saving,
    canWrite: isReady && !saving,
    error: userId
      ? (mutationError ?? query.error ?? query.data?.importError)
      : null,
    hasPendingImport: Boolean(userId && query.data?.pendingBatchId),
    discardImport: () => {
      if (query.data?.pendingBatchId)
        write({ kind: 'discard-import', batchId: query.data.pendingBatchId })
    },
    retry: () => {
      client
        .getMutationCache()
        .findAll({ mutationKey: key, status: 'error' })
        .forEach(item => client.getMutationCache().remove(item))
      void query.refetch()
    },
    write,
  }
}
