'use client'
import { useQuery } from '@tanstack/react-query'

import { fetchProduct, fetchProducts } from '@/shared/api/products'

export const productKeys = {
  all: ['products'] as const,
  list: () => [...productKeys.all, 'list'] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
}

export const useProducts = () =>
  useQuery({
    queryKey: productKeys.list(),
    queryFn: ({ signal }) => fetchProducts(signal),
  })

export const useProduct = (id: string) =>
  useQuery({
    queryKey: productKeys.detail(id),
    queryFn: ({ signal }) => fetchProduct(id, signal),
    enabled: Boolean(id),
  })
