import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useProductFilters } from './useProductFilters'
import { productKeys } from '@/shared/hooks/useProducts'
import { fetchCatalog } from '@/shared/api/products'
import { useAppSelector } from '@/redux/hooks'
import {
  serializeFilters,
  type CatalogRequest,
} from '@/shared/filters/productFilters'

export const useCatalog = () => {
  const { filters, sort, page } = useProductFilters()
  const location = useLocation()
  const navigate = useNavigate()
  const grid = useAppSelector(state => state.catalogView.grid_view)
  const request: CatalogRequest = {
    filters,
    sort,
    page: grid ? page : 1,
    pageSize: grid ? 6 : 100,
  }
  const {
    data,
    isPending,
    isPlaceholderData,
    isLoadingError,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: productKeys.catalog(request),
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => fetchCatalog(request, signal),
  })
  useEffect(() => {
    if (
      !grid ||
      !data ||
      isPlaceholderData ||
      isFetching ||
      isError ||
      data.page >= page
    )
      return
    const params = serializeFilters(
      { filters, sort, page: data.page },
      new URLSearchParams(location.search)
    )
    navigate(
      {
        pathname: location.pathname,
        search: params.toString(),
        hash: location.hash,
      },
      { replace: true, preventScrollReset: true }
    )
  }, [
    data,
    filters,
    grid,
    isError,
    isFetching,
    isPlaceholderData,
    location.hash,
    location.pathname,
    location.search,
    navigate,
    page,
    sort,
  ])
  return {
    products: isPlaceholderData ? [] : (data?.items ?? []),
    total: isPlaceholderData ? 0 : (data?.total ?? 0),
    filters: {
      ...filters,
      minPrice: filters.minPrice ?? data?.min_price ?? 0,
      min_price: data?.min_price ?? 0,
      max_price: data?.max_price ?? 0,
      price: filters.price ?? data?.max_price ?? 0,
    },
    isPending: isPending || isPlaceholderData,
    isLoadingError,
    isFetching,
    sort,
    pageSize: request.pageSize,
    refetch,
  }
}
