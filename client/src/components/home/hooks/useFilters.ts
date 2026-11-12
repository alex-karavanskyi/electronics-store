import { useProductFilters } from './useProductFilters'
import {
  FilterName,
  HandleFiltersFn,
} from '@/components/home/filters/filterTypes'

export const useFilters = () => {
  const { filters, updateFilter, updateSort, resetFilters } =
    useProductFilters()

  const handleFilters: HandleFiltersFn = (...[name, value]) => {
    if (name === FilterName.Text) updateFilter('text', value)
    if (name === FilterName.MinPrice) updateFilter('minPrice', value)
    if (name === FilterName.Price) updateFilter('price', value)
    if (name === FilterName.Sort) updateSort(value)
    if (name === FilterName.Category) {
      const category = value
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
