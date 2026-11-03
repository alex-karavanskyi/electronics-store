import { useQuery } from '@tanstack/react-query'
import type { CatalogRequest } from '@/shared/filters/productFilters'
import { fetchProduct, fetchProducts } from '@/shared/api/products'
import type { Product } from '@/shared/types/productSchema'

export const productKeys = {
  all: ['products'] as const,
  scope: () => productKeys.all,
  list: () => [...productKeys.all, 'list'] as const,
  catalog: (request: CatalogRequest) =>
    [...productKeys.all, 'catalog', request] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
}

export const useProducts = () =>
  useQuery({
    queryKey: productKeys.list(),
    queryFn: ({ signal }) => fetchProducts(signal),
  })

export const useProduct = (id: string, revalidate = false) =>
  useQuery({
    queryKey: productKeys.detail(id),
    // null is the local tombstone after a confirmed deletion.
    queryFn: ({ signal }): Promise<Product | null> => fetchProduct(id, signal),
    enabled: Boolean(id),
    refetchOnMount: revalidate ? 'always' : true,
    refetchOnWindowFocus: revalidate ? 'always' : true,
    refetchOnReconnect: revalidate ? 'always' : true,
  })
