import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/shared/api/http'

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: (failureCount, error) => {
          const status = error instanceof ApiError ? error.status : undefined
          if (status && status >= 400 && status < 500) return false
          return failureCount < 2
        },
      },
    },
  })
