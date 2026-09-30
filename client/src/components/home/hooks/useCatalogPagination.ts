import type { MouseEvent } from 'react'
import { useLocation } from 'react-router-dom'

import { clampPage, serializeFilters } from '@/shared/filters/productFilters'

import { useProductFilters } from './useProductFilters'

type CatalogPaginationOptions = {
  pageSize: number
  totalItems: number
}

export const useCatalogPagination = ({
  pageSize,
  totalItems,
}: CatalogPaginationOptions) => {
  const criteria = useProductFilters()
  const { pathname, search, hash } = useLocation()
  const currentPage = clampPage(criteria.page, totalItems, pageSize)
  const totalPages = Math.ceil(totalItems / pageSize)
  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1
  )
  const previousPage = Math.max(1, currentPage - 1)
  const nextPage = Math.max(1, Math.min(totalPages, currentPage + 1))
  const isPreviousDisabled = currentPage <= 1
  const isNextDisabled = currentPage >= totalPages

  const getPageLink = (page: number) => {
    const params = serializeFilters(
      { ...criteria, page },
      new URLSearchParams(search)
    )
    return { pathname, search: params.toString(), hash }
  }

  const handlePageClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return

    const catalog = document.getElementById('collection')
    catalog?.focus({ preventScroll: true })
    catalog?.scrollIntoView({ block: 'start' })
  }

  const handlePreviousClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isPreviousDisabled) event.preventDefault()
    else handlePageClick(event)
  }

  const handleNextClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isNextDisabled) event.preventDefault()
    else handlePageClick(event)
  }

  return {
    currentPage,
    pageNumbers,
    previousPage,
    nextPage,
    isPreviousDisabled,
    isNextDisabled,
    getPageLink,
    handlePageClick,
    handlePreviousClick,
    handleNextClick,
  }
}
