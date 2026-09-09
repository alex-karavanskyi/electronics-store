'use client'
import { useMemo } from 'react'

import { useAppSelector } from '@/redux/hooks'
import { Product } from '@/shared/types/productsType'
import { filterProducts, getPriceBounds } from '@/shared/utils/filterProducts'

import { useProducts } from './useProducts'

const emptyProducts: Product[] = []

export const useCatalog = () => {
  const { data, isPending, isLoadingError, refetch } = useProducts()
  const allProducts = data ?? emptyProducts
  const { filters, sort } = useAppSelector(state => state.filter)
  const bounds = useMemo(() => getPriceBounds(allProducts), [allProducts])
  const products = useMemo(
    () => filterProducts(allProducts, filters, sort),
    [allProducts, filters, sort]
  )
  return {
    products,
    filters: {
      ...filters,
      ...bounds,
      price: filters.price ?? bounds.max_price,
    },
    isPending,
    isLoadingError,
    refetch,
  }
}
