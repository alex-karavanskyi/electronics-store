import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAccess } from '@/shared/auth/useAccess'
import { fetchMyProducts } from '@/shared/api/products'

export const myProductsKey = (userId: string | null) =>
  ['my-products', userId] as const

export function useMyProducts() {
  const access = useAccess()
  const userId = access.status === 'authenticated' ? access.userId : null
  const lifetime = useRef({ userId, generation: 0 })
  if (lifetime.current.userId !== userId)
    lifetime.current = { userId, generation: lifetime.current.generation + 1 }
  const generation = lifetime.current.generation

  return useQuery({
    queryKey: myProductsKey(userId),
    enabled: Boolean(userId),
    staleTime: 60_000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    queryFn: async ({ signal }) => {
      const assertCurrent = () => {
        if (signal.aborted || lifetime.current.generation !== generation)
          throw new DOMException('Session changed', 'AbortError')
      }
      const getToken = async () => {
        assertCurrent()
        const token = await access.getToken()
        assertCurrent()
        return token
      }
      const products = await fetchMyProducts(getToken, signal)
      assertCurrent()
      return products
    },
  })
}
