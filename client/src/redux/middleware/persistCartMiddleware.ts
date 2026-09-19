import { Middleware } from '@reduxjs/toolkit'

import {
  addToCart,
  clearCart,
  decrementQuantity,
  incrementQuantity,
  removeFromCart,
} from '@/redux/features/cartSlice'
import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION,
} from '@/shared/constants/localStorage'

const persistedActions = new Set([
  addToCart.type,
  clearCart.type,
  decrementQuantity.type,
  incrementQuantity.type,
  removeFromCart.type,
])

export const persistCartMiddleware: Middleware = store => next => action => {
  const result = next(action)

  if (typeof window !== 'undefined' && persistedActions.has(action.type)) {
    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({
          version: CART_STORAGE_VERSION,
          items: store.getState().cart.items,
        })
      )
    } catch {
      // The cart remains usable in memory when storage is unavailable or full.
    }
  }

  return result
}
