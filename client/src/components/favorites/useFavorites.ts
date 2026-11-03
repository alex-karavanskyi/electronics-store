import { useAccess } from '@/shared/auth/useAccess'
import type { Product } from '@/shared/types/productSchema'
import { useGuestFavorites } from './useGuestFavorites'
import { useAccountFavorites } from './useAccountFavorites'
export { guestFavoritesKey } from './useGuestFavorites'

export function useFavorites() {
  const access = useAccess()
  const guest = useGuestFavorites()
  const account = useAccountFavorites()
  const authenticated = access.status === 'authenticated'
  const loading = access.status === 'loading'
  const favoriteIds = loading
    ? []
    : authenticated
      ? account.ids
      : guest.favoriteIds
  return {
    favoriteIds,
    storageAvailable: authenticated || loading ? true : guest.storageAvailable,
    isLoading: loading || (authenticated && account.isLoading),
    isSaving: authenticated && account.isSaving,
    canWrite: !loading && (!authenticated || account.canWrite),
    error: authenticated ? account.error : null,
    retry: account.retry,
    hasPendingImport: authenticated && account.hasPendingImport,
    discardImport: account.discardImport,
    addFavorite: (product: Product) => {
      if (loading) return
      if (authenticated) account.write({ kind: 'add', id: product.id })
      else guest.addFavorite(product)
    },
    removeFavorite: (id: string) => {
      if (loading) return
      if (authenticated) account.write({ kind: 'remove', id })
      else guest.removeFavorite(id)
    },
    toggleFavorite: (product: Product) => {
      if (loading) return
      if (authenticated)
        account.write({
          kind: favoriteIds.includes(product.id) ? 'remove' : 'add',
          id: product.id,
        })
      else guest.toggleFavorite(product)
    },
    setFavoriteOrder: (ids: string[]) => {
      if (loading) return
      if (authenticated)
        account.write({ kind: 'order', ids, revision: account.revision })
      else guest.setFavoriteOrder(ids)
    },
  }
}
