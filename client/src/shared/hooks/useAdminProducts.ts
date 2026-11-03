import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAccess } from '@/shared/auth/useAccess'
import { fetchAdminProducts } from '@/shared/api/products'

export const adminProductsKey = (userId: string | null) =>
  ['admin-products', userId] as const

export function useAdminProducts() {
  const access = useAccess()
  const userId =
    access.status === 'authenticated' && access.isAdmin ? access.userId : null
  const lifetime = useRef({ userId, generation: 0 })
  if (lifetime.current.userId !== userId)
    lifetime.current = { userId, generation: lifetime.current.generation + 1 }
  const generation = lifetime.current.generation
  return useQuery({
    queryKey: adminProductsKey(userId),
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
      const rows = await fetchAdminProducts(getToken, signal)
      assertCurrent()
      return rows
    },
  })
}
