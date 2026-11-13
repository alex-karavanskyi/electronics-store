import { useQueryStates } from 'nuqs'
import {
  catalogParsers,
  type CatalogState,
  type Sorting,
} from '@/shared/filters/productFilters'

export function useProductFilters() {
  const [{ sort, page, ...filters }, setFilters] = useQueryStates(
    catalogParsers,
    {
      history: 'push',
      shallow: false,
      scroll: false,
    }
  )

  return {
    filters,
    sort,
    page,
    sorting: sort,
    updateFilter: <K extends keyof CatalogState['filters']>(
      name: K,
      value: CatalogState['filters'][K]
    ) =>
      setFilters({
        [name]: Array.isArray(value)
          ? catalogParsers.category.parse(value)
          : value,
        page: 1,
      }),
    updateSort: (sort: Sorting) => setFilters({ sort, page: 1 }),
    updatePage: (page: number) => setFilters({ page }),
    resetFilters: () => setFilters(null),
  }
}
