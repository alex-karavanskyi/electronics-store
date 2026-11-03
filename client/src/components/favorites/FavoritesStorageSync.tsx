import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAccess } from '@/shared/auth/useAccess'
import { FAVORITES_STORAGE_KEY } from '@/shared/constants/localStorage'
import {
  parseFavoriteIds,
  loadGuestFavorites,
  type GuestFavorites,
} from '@/shared/lib/favoritesStorage'
import { guestFavoritesKey } from './useGuestFavorites'
import { useAccountFavorites } from './useAccountFavorites'

export default function FavoritesStorageSync() {
  const client = useQueryClient()
  useAccountFavorites()
  const access = useAccess()
  const userId = access.status === 'authenticated' ? access.userId : null
  useEffect(() => {
    const isOtherUser = (key: readonly unknown[]) =>
      key[0] === 'favorites' && key[1] === 'user' && key[2] !== userId
    void client.cancelQueries({
      predicate: query => isOtherUser(query.queryKey),
    })
    client.removeQueries({ predicate: query => isOtherUser(query.queryKey) })
    client
      .getMutationCache()
      .getAll()
      .forEach(mutation => {
        if (isOtherUser(mutation.options.mutationKey ?? []))
          client.getMutationCache().remove(mutation)
      })
    if (!userId && access.status !== 'loading')
      client.setQueryData<GuestFavorites>(
        guestFavoritesKey,
        (current: GuestFavorites | undefined) =>
          current?.storageAvailable === false ? current : loadGuestFavorites()
      )
  }, [client, userId, access.status])
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== FAVORITES_STORAGE_KEY) return
      try {
        if (event.storageArea !== window.localStorage) return
      } catch {
        return
      }
      client.setQueryData<GuestFavorites>(guestFavoritesKey, {
        ids: parseFavoriteIds(event.newValue),
        storageAvailable: true,
      })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [client])
  return null
}
