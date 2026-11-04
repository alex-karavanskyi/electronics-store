import { Middleware } from '@reduxjs/toolkit'
import type { CartItem } from '@/redux/features/cartSlice'

import {
  updateCartProduct,
  updateCartProductImages,
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
  updateCartProduct.type,
  updateCartProductImages.type,
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
          // Inline uploads can exceed localStorage quota. ProductImagesSync
          // restores current images from the API after hydration.
          items: (store.getState().cart.items as CartItem[]).map(item => ({
            ...item,
            product: {
              ...item.product,
              image: item.product.image.startsWith('data:')
                ? ''
                : item.product.image,
              images: item.product.images.filter(
                image => !image.startsWith('data:')
              ),
            },
          })),
        })
      )
    } catch {
      // The cart remains usable in memory when storage is unavailable or full.
    }
  }

  return result
}
