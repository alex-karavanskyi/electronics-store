import { useEffect, useRef } from 'react'

import { useSearchParams } from 'next/navigation'

import { initializeFilters } from '@/redux/features/filterSlice'
import { useAppDispatch } from '@/redux/hooks'

import { FilterName } from '../types/productsType'

export const useInitializeFiltersFromUrl = () => {
  const dispatch = useAppDispatch()
  const searchParams = useSearchParams()

  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    dispatch(
      initializeFilters({
        text: searchParams.get(FilterName.Text) ?? '',
        price:
          searchParams.has(FilterName.Price) &&
          Number.isFinite(Number(searchParams.get(FilterName.Price)))
            ? Math.max(0, Number(searchParams.get(FilterName.Price)))
            : null,
        sort: searchParams.get(FilterName.Sort) ?? 'price-lowest',
        category: searchParams.getAll(FilterName.Category),
      })
    )
  }, [dispatch, searchParams])
}
