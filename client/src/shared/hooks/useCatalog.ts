import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useProductFilters } from './useProductFilters'
import { productKeys } from './useProducts'
import { fetchCatalog } from '@/shared/api/products'
import { useAppSelector } from '@/redux/hooks'
import type { CatalogRequest } from '@/shared/filters/productFilters'
export const useCatalog = () => {
  const { filters, sort, page } = useProductFilters()
  const grid = useAppSelector(state => state.catalogView.grid_view)
  const request: CatalogRequest = {
    filters,
    sort,
    page: grid ? page : 1,
    pageSize: grid ? 6 : 100,
  }
  const { data, isPending, isPlaceholderData, isLoadingError, refetch } =
    useQuery({
      queryKey: productKeys.catalog(request),
      placeholderData: keepPreviousData,
      queryFn: ({ signal }) => fetchCatalog(request, signal),
    })
  return {
    products: isPlaceholderData ? [] : (data?.items ?? []),
    total: isPlaceholderData ? 0 : (data?.total ?? 0),
    filters: {
      ...filters,
      min_price: data?.min_price ?? 0,
      max_price: data?.max_price ?? 0,
      price: filters.price ?? data?.max_price ?? 0,
    },
    isPending: isPending || isPlaceholderData,
    isLoadingError,
    refetch,
  }
}
