import { Link } from 'react-router-dom'

import { useCatalogPagination } from '@/components/home/hooks/useCatalogPagination'

import PaginationArrow from './PaginationArrow'
import styles from './Pagination.module.scss'

type PaginationProps = {
  pageSize: number
  totalItems: number
}

const Pagination = ({ pageSize, totalItems }: PaginationProps) => {
  const {
    currentPage,
    pageItems,
    previousPage,
    nextPage,
    isPreviousDisabled,
    isNextDisabled,
    getPageLink,
    handlePageClick,
    handlePreviousClick,
    handleNextClick,
  } = useCatalogPagination({ pageSize, totalItems })

  return (
    <nav className={styles.container} aria-label="Product pagination">
      <ul className={styles.pagination__container}>
        <PaginationArrow
          direction="previous"
          to={getPageLink(previousPage)}
          isDisabled={isPreviousDisabled}
          onClick={handlePreviousClick}
        />
        {pageItems.map(number =>
          typeof number === 'string' ? (
            <li
              key={number}
              className={styles.pagination__ellipsis}
              aria-hidden="true"
            >
              …
            </li>
          ) : (
            <li
              key={number}
              className={
                number === currentPage
                  ? [styles.pagination, styles['pagination--active']].join(' ')
                  : styles.pagination
              }
            >
              <Link
                onClick={handlePageClick}
                aria-current={number === currentPage ? 'page' : undefined}
                to={getPageLink(number)}
                className={styles.pagination__link}
              >
                {number}
              </Link>
            </li>
          )
        )}
        <PaginationArrow
          direction="next"
          to={getPageLink(nextPage)}
          isDisabled={isNextDisabled}
          onClick={handleNextClick}
        />
      </ul>
    </nav>
  )
}

export default Pagination
