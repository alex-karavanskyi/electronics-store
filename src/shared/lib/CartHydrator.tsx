'use client'
import { useEffect } from 'react'

import { CartItem, hydrateCart } from '@/redux/features/cartSlice'
import { useAppDispatch } from '@/redux/hooks'
import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION,
} from '@/shared/constants/localStorage'

const isCartItem = (value: unknown): value is CartItem => {
  if (!value || typeof value !== 'object') return false

  const item = value as CartItem
  return (
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    typeof item.product?.id === 'string' &&
    typeof item.product?.name === 'string' &&
    typeof item.product?.price === 'number' &&
    typeof item.product?.image === 'string'
  )
}

const CartHydrator = () => {
  const dispatch = useAppDispatch()

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY)
      const parsedCart: unknown = storedCart ? JSON.parse(storedCart) : null
      const persisted =
        parsedCart && typeof parsedCart === 'object'
          ? (parsedCart as { version?: number; items?: unknown })
          : null
      const storedItems =
        persisted?.version === CART_STORAGE_VERSION ? persisted.items : []
      dispatch(
        hydrateCart(
          Array.isArray(storedItems) ? storedItems.filter(isCartItem) : []
        )
      )
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY)
      dispatch(hydrateCart([]))
    }
  }, [dispatch])

  return null
}

export default CartHydrator
