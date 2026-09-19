import { useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  parseFilters,
  serializeFilters,
  type CatalogFilters,
  type Sorting,
} from '@/shared/filters/productFilters'
export function useProductFilters() {
  const location = useLocation()
  const navigate = useNavigate()
  const pending = useRef({
    key: location.key,
    params: new URLSearchParams(location.search),
  })
  if (pending.current.key !== location.key)
    pending.current = {
      key: location.key,
      params: new URLSearchParams(location.search),
    }
  const state = useMemo(
    () => parseFilters(new URLSearchParams(location.search)),
    [location.search]
  )
  const commit = (change: (current: CatalogFilters) => CatalogFilters) => {
    const params = serializeFilters(
      change(parseFilters(pending.current.params)),
      pending.current.params
    )
    pending.current.params = params
    navigate(
      {
        pathname: location.pathname,
        search: params.toString(),
        hash: location.hash,
      },
      { preventScrollReset: true }
    )
  }
  return {
    ...state,
    sorting: state.sort,
    updateFilter: <K extends keyof CatalogFilters['filters']>(
      name: K,
      value: CatalogFilters['filters'][K]
    ) =>
      commit(current => ({
        ...current,
        filters: { ...current.filters, [name]: value },
        page: 1,
      })),
    updateSort: (sort: Sorting) =>
      commit(current => ({ ...current, sort, page: 1 })),
    updatePage: (page: number) => commit(current => ({ ...current, page })),
    resetFilters: () => commit(() => parseFilters(new URLSearchParams())),
  }
}
