import { useProductFilters } from './useProductFilters'
import { FilterName, HandleFiltersFn } from '@/shared/types/productsType'
import type { Sorting } from '@/shared/filters/productFilters'

export const useFilters = () => {
  const { filters, updateFilter, updateSort, resetFilters } =
    useProductFilters()
  const handleFilters: HandleFiltersFn = (name, value) => {
    if (name === FilterName.Text) updateFilter('text', String(value))
    if (name === FilterName.Price) updateFilter('price', Number(value))
    if (name === FilterName.Sort) updateSort(String(value) as Sorting)
    if (name === FilterName.Category) {
      const category = String(value)
      updateFilter(
        'category',
        filters.category.includes(category)
          ? filters.category.filter(item => item !== category)
          : [...filters.category, category]
      )
    }
  }
  return { handleFilters, handleClearButton: resetFilters }
}
