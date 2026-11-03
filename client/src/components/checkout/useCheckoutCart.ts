import { useEffect, useRef } from 'react'
import { useStore } from 'react-redux'
import { useQueryClient } from '@tanstack/react-query'
import type { RootState } from '@/redux/store'
import { removeFromCart, updateCartProduct } from '@/redux/features/cartSlice'
import { ApiError } from '@/shared/api/http'
import { fetchProduct } from '@/shared/api/products'
import { productKeys } from '@/shared/hooks/useProducts'
import { sameProduct } from '@/shared/utils/sameProduct'

export default function useCheckoutCart() {
  const store = useStore<RootState>()
  const client = useQueryClient()
  const lifetime = useRef({ mounted: true })
  useEffect(() => {
    const current = lifetime.current
    current.mounted = true
    return () => {
      current.mounted = false
    }
  }, [])

  return async (): Promise<string | null> => {
    const isCurrent = () => lifetime.current.mounted
    const items = store.getState().cart.items
    const before = JSON.stringify(items)
    const results = await Promise.allSettled(
      items.map(async ({ product }) => {
        const queryKey = productKeys.detail(product.id)
        // Confirmation needs a read started now, not an older in-flight request.
        await client.cancelQueries({ queryKey, exact: true })
        if (!isCurrent())
          throw new DOMException('Checkout closed', 'AbortError')
        return client.fetchQuery({
          queryKey,
          queryFn: async ({ signal }) => {
            const current = await fetchProduct(product.id, signal)
            if (current.id !== product.id)
              throw new ApiError(502, 'Invalid product response')
            return current
          },
          staleTime: 0,
          retry: false,
          // Report an offline failure immediately instead of pausing confirmation.
          networkMode: 'always',
        })
      })
    )
    if (!isCurrent()) return 'Checkout closed.'
    let failed = false
    results.forEach((result, index) => {
      const id = items[index].product.id
      if (result.status === 'fulfilled') {
        const item = store
          .getState()
          .cart.items.find(item => item.product.id === id)
        if (item && !sameProduct(item.product, result.value))
          store.dispatch(updateCartProduct(result.value))
      } else if (
        result.reason instanceof ApiError &&
        result.reason.status === 404
      ) {
        store.dispatch(removeFromCart(id))
      } else failed = true
    })
    if (failed)
      return 'Unable to check your cart. Your items are saved; check your connection and try again.'
    if (!items.length || before !== JSON.stringify(store.getState().cart.items))
      return 'Your cart has changed. Please review the available items and total before continuing.'
    return null
  }
}
