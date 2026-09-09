import {
  clearFilters,
  updateFilters,
  updateSort,
} from '@/redux/features/filterSlice'
import { numberPagination } from '@/redux/features/paginationSlice'
import { AppDispatch } from '@/redux/store'

import { FilterName } from '../types/productsType'
import { normalizeCategories } from '../utils/normalizeCategories'

export type DebouncedUpdateFilters = (params: URLSearchParams) => void

interface FilterActionProps<T> {
  value: T
  params: URLSearchParams
  dispatch: AppDispatch
  debouncedUpdateFilters: DebouncedUpdateFilters
}

export type UpdatePriceFilterProps = FilterActionProps<number>

export type UpdateTextFilterProps = FilterActionProps<string>

export type UpdateSortFilterProps = FilterActionProps<string>

export interface CategoryFilterProps extends FilterActionProps<string> {
  selectedCategories: string | string[] | undefined
}

export const clearAllFilters = (
  dispatch: AppDispatch,
  debouncedUpdateFilters: DebouncedUpdateFilters
) => {
  dispatch(clearFilters())

  dispatch(numberPagination(1))

  debouncedUpdateFilters(new URLSearchParams())
}

export const updatePriceFilter = ({
  value,
  params,
  dispatch,
  debouncedUpdateFilters,
}: UpdatePriceFilterProps) => {
  params.set(FilterName.Price, String(value))

  dispatch(
    updateFilters({
      name: FilterName.Price,
      value,
    })
  )

  dispatch(numberPagination(1))

  debouncedUpdateFilters(params)
}

export const updateTextFilter = ({
  value,
  params,
  dispatch,
  debouncedUpdateFilters,
}: UpdateTextFilterProps) => {
  if (value) {
    params.set(FilterName.Text, value)
  } else {
    params.delete(FilterName.Text)
  }

  dispatch(
    updateFilters({
      name: FilterName.Text,
      value,
    })
  )

  dispatch(numberPagination(1))

  debouncedUpdateFilters(params)
}

export const updateSortFilter = ({
  value,
  params,
  dispatch,
  debouncedUpdateFilters,
}: UpdateSortFilterProps) => {
  params.set(FilterName.Sort, value)

  dispatch(updateSort(value))

  dispatch(numberPagination(1))

  debouncedUpdateFilters(params)
}

export const updateCategoryFilters = ({
  value,
  params,
  dispatch,
  selectedCategories,
  debouncedUpdateFilters,
}: CategoryFilterProps) => {
  const current = normalizeCategories(selectedCategories)

  const category = String(value)

  const next = current.includes(category)
    ? current.filter(item => item !== category)
    : [...current, category]

  params.delete(FilterName.Category)

  next.forEach(category => params.append(FilterName.Category, category))

  dispatch(
    updateFilters({
      name: FilterName.Category,
      value: next,
    })
  )

  dispatch(numberPagination(1))

  debouncedUpdateFilters(params)
}
