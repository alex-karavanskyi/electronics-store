import type {
  MergeFavorites,
  ReorderFavorites,
} from '../validation/favoritesInput.js'

export type Favorites = { ids: string[]; revision: number }
export interface FavoritesService {
  get(userId: string): Promise<Favorites>
  add(userId: string, productId: string): Promise<Favorites>
  remove(userId: string, productId: string): Promise<Favorites>
  merge(userId: string, input: MergeFavorites): Promise<Favorites>
  reorder(userId: string, input: ReorderFavorites): Promise<Favorites>
}
