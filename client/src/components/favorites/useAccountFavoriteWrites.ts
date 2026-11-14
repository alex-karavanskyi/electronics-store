import { useEffect, useRef } from 'react'
import {
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  fetchFavorites,
  writeFavorite,
  type AccountFavorites,
  type FavoriteWrite,
} from '@/shared/api/favorites'
import { completeGuestImport } from '@/shared/lib/favoritesStorage'

type AccountKey = readonly ['favorites', 'user', string | null]
export type AccountWrite =
  FavoriteWrite | { kind: 'discard-import'; batchId: string }
type Options = {
  key: AccountKey
  identity: string
  current: () => boolean
  getToken: () => Promise<string | null>
  isReady: boolean
}

export function useAccountFavoriteWrites({
  key,
  identity,
  current,
  getToken,
  isReady,
}: Options) {
  const client = useQueryClient()
  const controllers = useRef(new Set<AbortController>())
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
  type PendingWrite = {
    input: AccountWrite
    controller: AbortController
    active: () => boolean
    getToken: () => Promise<string | null>
    key: AccountKey
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
      if (pending.active() && !pending.controller.signal.aborted) {
        client.setQueryData<AccountFavorites>(pending.key, data)
        if (pending.input.kind === 'add' && data.ids.includes(pending.input.id))
          toast.success('Product added to favorites', {
            id: `favorite-${pending.input.id}`,
          })
      }
    },
    onSettled: (_data, _error, pending) => {
      if (pending.active() && !pending.controller.signal.aborted)
        void client.invalidateQueries({ queryKey: pending.key, exact: true })
    },
    onError: (error, pending) => {
      if (
        pending.active() &&
        !pending.controller.signal.aborted &&
        !(error instanceof Error && error.name === 'AbortError')
      )
        toast.error(
          'Your wishlist could not be updated. Open Favorites to retry.',
          {
            id: 'favorites-write-error',
          }
        )
    },
  })

  const write = (input: AccountWrite) => {
    if (!isReady || !current() || client.isMutating({ mutationKey: key }))
      return
    const controller = new AbortController()
    controllers.current.add(controller)
    mutation.mutate({
      input,
      controller,
      active: current,
      getToken,
      key,
    })
  }
  const latest = mutations[mutations.length - 1]
  const mutationError = latest?.status === 'error' ? latest.error : null
  return {
    write,
    error: mutationError,
    clearError: () => {
      client
        .getMutationCache()
        .findAll({ mutationKey: key, status: 'error' })
        .forEach(item => client.getMutationCache().remove(item))
    },
  }
}
