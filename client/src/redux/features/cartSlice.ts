import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { Product } from '@/shared/types/productSchema'
import type { RootState } from '@/redux/store'

export interface CartItem {
  product: Product
  quantity: number
}

interface CartState {
  items: CartItem[]
  isOpen: boolean
  isHydrated: boolean
}

const initialState: CartState = {
  items: [],
  isOpen: false,
  isHydrated: false,
}

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    updateCartProductImages: (
      state,
      action: PayloadAction<Pick<Product, 'id' | 'image' | 'images'>>
    ) => {
      const product = state.items.find(
        item => item.product.id === action.payload.id
      )?.product
      if (!product) return
      product.image = action.payload.image
      product.images = action.payload.images
    },
    addToCart: (state, action: PayloadAction<Product>) => {
      const item = state.items.find(
        ({ product }) => product.id === action.payload.id
      )

      if (item) {
        item.quantity += 1
      } else {
        state.items.push({ product: action.payload, quantity: 1 })
      }
    },
    incrementQuantity: (state, action: PayloadAction<Product['id']>) => {
      const item = state.items.find(
        ({ product }) => product.id === action.payload
      )
      if (item) item.quantity += 1
    },
    decrementQuantity: (state, action: PayloadAction<Product['id']>) => {
      const item = state.items.find(
        ({ product }) => product.id === action.payload
      )
      if (!item) return

      if (item.quantity === 1) {
        state.items = state.items.filter(
          ({ product }) => product.id !== action.payload
        )
      } else {
        item.quantity -= 1
      }
    },
    removeFromCart: (state, action: PayloadAction<Product['id']>) => {
      state.items = state.items.filter(
        ({ product }) => product.id !== action.payload
      )
    },
    clearCart: state => {
      state.items = []
    },
    openCart: state => {
      state.isOpen = true
    },
    closeCart: state => {
      state.isOpen = false
    },
    hydrateCart: (state, action: PayloadAction<CartItem[]>) => {
      if (state.isHydrated) return
      state.items = action.payload
      state.isHydrated = true
    },
  },
})

export const {
  updateCartProductImages,
  addToCart,
  clearCart,
  closeCart,
  decrementQuantity,
  hydrateCart,
  incrementQuantity,
  openCart,
  removeFromCart,
} = cartSlice.actions

export const selectCartQuantity = (state: RootState): number =>
  state.cart.items.reduce((total, item) => total + item.quantity, 0)

export default cartSlice.reducer
