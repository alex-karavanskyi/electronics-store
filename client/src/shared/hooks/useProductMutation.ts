import { useEffect, useRef } from 'react'
import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { useAccess } from '@/shared/auth/useAccess'
import { ApiError } from '@/shared/api/http'
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from '@/shared/api/products'
import type { ProductInput } from '@/shared/types/productSchema'
import { useAppDispatch } from '@/redux/hooks'
import { removeFromCart, updateCartProduct } from '@/redux/features/cartSlice'
import { productKeys } from './useProducts'
import { myProductsKey } from './useMyProducts'
import { adminProductsKey } from './useAdminProducts'

type ProductWrite =
  | { kind: 'create'; input: ProductInput }
  | { kind: 'update'; id: string; input: Partial<ProductInput> }
  | { kind: 'delete'; id: string }

const mutationKey = ['product-writes'] as const

export function productWriteError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401)
      return 'Your session has expired. Sign in again to continue.'
    if (error.status === 403)
      return 'You can only change your own products. Your changes have not been saved.'
    if (error.status === 404)
      return 'This product is no longer available. Close this form and return to the catalog.'
    return error.message
  }
  return 'Unable to confirm the change. Check your connection and refresh the catalog before retrying.'
}

export function useProductMutation() {
  const access = useAccess()
  const client = useQueryClient()
  const dispatch = useAppDispatch()
  const identity = `${access.status}:${access.userId}:${access.isAdmin}`
  const lifetime = useRef({ identity, generation: 0 })
  if (lifetime.current.identity !== identity)
    lifetime.current = { identity, generation: lifetime.current.generation + 1 }
  const generation = lifetime.current.generation
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const isCurrent = () =>
    mounted.current && lifetime.current.generation === generation
  const saving = useIsMutating({ mutationKey }) > 0

  const mutation = useMutation({
    mutationKey,
    retry: false,
    onMutate: () => ({ userId: access.userId }),
    mutationFn: async (write: ProductWrite) => {
      if (access.status !== 'authenticated')
        throw new ApiError(401, 'Sign in to continue')
      const getToken = async () => {
        if (!isCurrent())
          throw new DOMException('Session changed', 'AbortError')
        const token = await access.getToken()
        if (!isCurrent())
          throw new DOMException('Session changed', 'AbortError')
        return token
      }
      if (write.kind === 'create') return createProduct(write.input, getToken)
      if (write.kind === 'update')
        return updateProduct(write.id, write.input, getToken)
      try {
        await deleteProduct(write.id, getToken)
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) throw error
      }
      return undefined
    },
    onSuccess: async (product, write, session) => {
      // A read started before the write must not overwrite its result.
      const scope = productKeys.scope()
      await client.cancelQueries({ queryKey: scope })
      if (write.kind === 'delete') {
        client.setQueryData(productKeys.detail(write.id), null)
        dispatch(removeFromCart(write.id))
        void client.invalidateQueries({ queryKey: ['favorites', 'user'] })
      } else if (product) {
        client.setQueryData(productKeys.detail(product.id), product)
        dispatch(updateCartProduct(product))
      }
      // These are public data. Even if a session/page changed while the server
      // was writing, the successful result must still invalidate stale reads.
      void client.invalidateQueries({ queryKey: scope })
      if (session?.userId) {
        // Invalidate only the originating account, even after navigating away.
        // Logout removes its query; invalidation never recreates missing data
        // and cannot refresh another account's private list.
        const key = myProductsKey(session.userId)
        await client.cancelQueries({ queryKey: key, exact: true })
        void client.invalidateQueries({ queryKey: key, exact: true })
        const adminKey = adminProductsKey(session.userId)
        await client.cancelQueries({ queryKey: adminKey, exact: true })
        void client.invalidateQueries({ queryKey: adminKey, exact: true })
      }
    },
  })
  return { ...mutation, isSaving: saving, isCurrent }
}
