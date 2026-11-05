import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { productKeys } from '@/shared/hooks/useProducts'
import { productSchema, type Product } from '@/shared/types/productSchema'
import {
  loadGuestFavorites,
  updateGuestFavorites,
  type GuestFavorites,
} from '@/shared/lib/favoritesStorage'

export const guestFavoritesKey = ['favorites', 'guest'] as const

export function useGuestFavorites() {
  const client = useQueryClient()
  const { data } = useQuery({
    queryKey: guestFavoritesKey,
    queryFn: loadGuestFavorites,
    initialData: loadGuestFavorites,
    // Local writes and storage events own this cache; a refetch must not erase
    // in-memory edits when persistence is unavailable.
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const current = () =>
    client.getQueryData<GuestFavorites>(guestFavoritesKey) ?? data
  const commit = (update: (ids: string[]) => string[]) => {
    let addedIds: string[] = []
    const result = updateGuestFavorites(ids => {
      const next = update(ids)
      addedIds = next.filter(id => !ids.includes(id))
      return next
    }, current())
    const publish = (value: GuestFavorites) => {
      client.setQueryData(guestFavoritesKey, value)
      for (const id of addedIds)
        toast.success('Product added to favorites', { id: `favorite-${id}` })
    }
    if (result instanceof Promise) void result.then(publish)
    else publish(result)
  }
  const seedProduct = (product: Product) => {
    // An older catalog card must not replace a more recent detail response.
    const detailKey = productKeys.detail(product.id)
    if (client.getQueryData(detailKey) === undefined)
      client.setQueryData(detailKey, product)
  }
  const addFavorite = (product: Product) => {
    if (!productSchema.shape.id.safeParse(product.id).success) return
    seedProduct(product)
    commit(ids => (ids.includes(product.id) ? ids : [...ids, product.id]))
  }
  const removeFavorite = (id: string) => {
    commit(ids => ids.filter(item => item !== id))
  }
  const setFavoriteOrder = (ids: string[]) => {
    commit(existing =>
      ids.length !== existing.length ||
      new Set(ids).size !== ids.length ||
      ids.some(id => !existing.includes(id))
        ? existing
        : [...ids]
    )
  }

  return {
    favoriteIds: data.ids,
    storageAvailable: data.storageAvailable,
    addFavorite,
    removeFavorite,
    toggleFavorite: (product: Product) => {
      if (!productSchema.shape.id.safeParse(product.id).success) return
      seedProduct(product)
      commit(ids =>
        ids.includes(product.id)
          ? ids.filter(id => id !== product.id)
          : [...ids, product.id]
      )
    },
    setFavoriteOrder,
  }
}
