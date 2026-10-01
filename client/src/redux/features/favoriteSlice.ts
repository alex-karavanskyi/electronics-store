import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { Product } from '@/shared/types/productSchema'

interface FavoriteState {
  favorites_products: Product[]
}

const initialState: FavoriteState = {
  favorites_products: [],
}

const favoriteSlice = createSlice({
  name: 'favorite',
  initialState,
  reducers: {
    updateFavoriteProductImages: (
      state,
      action: PayloadAction<Pick<Product, 'id' | 'image' | 'images'>>
    ) => {
      const product = state.favorites_products.find(
        item => item.id === action.payload.id
      )
      if (!product) return
      product.image = action.payload.image
      product.images = action.payload.images
    },
    addFavorite: (state, action: PayloadAction<Product>) => {
      const exists = state.favorites_products.some(
        product => product.id === action.payload.id
      )
      if (!exists) {
        state.favorites_products.push(action.payload)
      }
    },
    removeFavorite: (state, action: PayloadAction<string>) => {
      state.favorites_products = state.favorites_products.filter(
        product => product.id !== action.payload
      )
    },
    toggleFavorite: (state, action: PayloadAction<Product>) => {
      const exists = state.favorites_products.some(
        product => product.id === action.payload.id
      )
      if (exists) {
        state.favorites_products = state.favorites_products.filter(
          product => product.id !== action.payload.id
        )
      } else {
        state.favorites_products.push(action.payload)
      }
    },
    setFavoriteOrder: (state, action: PayloadAction<string[]>) => {
      const ids = action.payload
      const productsById = new Map(
        state.favorites_products.map(product => [product.id, product])
      )
      if (
        ids.length !== productsById.size ||
        new Set(ids).size !== ids.length ||
        ids.some(id => !productsById.has(id))
      )
        return

      // Reorder.Group needs a controlled update for every proposed order,
      // including repeated orders, to release its internal reordering lock.
      state.favorites_products = ids.map(id => productsById.get(id)!)
    },
    reorderFavorite: (
      state,
      action: PayloadAction<{ from: number; to: number }>
    ) => {
      const { from, to } = action.payload
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= state.favorites_products.length ||
        to > state.favorites_products.length
      ) {
        return
      }

      const [movedItem] = state.favorites_products.splice(from, 1)
      state.favorites_products.splice(to, 0, movedItem)
    },
  },
})

export const {
  updateFavoriteProductImages,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  reorderFavorite,
  setFavoriteOrder,
} = favoriteSlice.actions
export default favoriteSlice.reducer
