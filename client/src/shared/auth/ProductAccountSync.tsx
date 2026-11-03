import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAccess } from './useAccess'

// Kept in the app shell: leaving the personal page must not disable logout cleanup.
export default function ProductAccountSync() {
  const access = useAccess()
  const client = useQueryClient()
  const userId = access.status === 'authenticated' ? access.userId : null
  useEffect(() => {
    const previousAccount = (key: readonly unknown[]) =>
      (key[0] === 'my-products' && key[1] !== userId) ||
      (key[0] === 'admin-products' && (key[1] !== userId || !access.isAdmin))
    void client.cancelQueries({
      predicate: query => previousAccount(query.queryKey),
    })
    client.removeQueries({
      predicate: query => previousAccount(query.queryKey),
    })
  }, [client, userId, access.isAdmin])
  return null
}
