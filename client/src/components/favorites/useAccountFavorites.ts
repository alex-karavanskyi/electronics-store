import { useRef } from 'react'
import { useIsMutating, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAccess } from '@/shared/auth/useAccess'
import { loadAccountFavorites } from './loadAccountFavorites'
import { useAccountFavoriteWrites } from './useAccountFavoriteWrites'

export const userFavoritesKey = (userId: string | null) =>
  ['favorites', 'user', userId] as const

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
  const saving = useIsMutating({ mutationKey: key }) > 0
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(userId) && !saving,
    staleTime: 60_000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    queryFn: ({ signal }) =>
      loadAccountFavorites({
        userId: userId!,
        client,
        signal,
        current,
        getToken: access.getToken,
      }),
  })
  const isReady = Boolean(
    userId && query.data && !query.error && !query.isFetching
  )
  const {
    write,
    error: mutationError,
    clearError,
  } = useAccountFavoriteWrites({
    key,
    identity,
    current,
    getToken: access.getToken,
    isReady,
  })
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
      clearError()
      void query.refetch()
    },
    write,
  }
}
