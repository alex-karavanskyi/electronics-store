import { Link, useLocation } from 'react-router-dom'

import { IoChevronBack, IoChevronForward } from 'react-icons/io5'

import { clampPage, serializeFilters } from '@/shared/filters/productFilters'
import { useProductFilters } from '@/shared/hooks/useProductFilters'

import styles from './Pagination.module.scss'

interface PaginationProducts {
  postsPerPage: number
  totalPosts: number
}

const Pagination: React.FC<PaginationProducts> = ({
  postsPerPage,
  totalPosts,
}) => {
  const criteria = useProductFilters()
  const { page } = criteria
  const currentPage = clampPage(page, totalPosts, postsPerPage)

  const totalPages = Math.ceil(totalPosts / postsPerPage)
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  const { pathname, search, hash } = useLocation()
  const pageLink = (page: number) => {
    const params = serializeFilters(
      { ...criteria, page },
      new URLSearchParams(search)
    )
    return { pathname, search: params.toString(), hash }
  }
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
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
  const goToPrev = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (currentPage <= 1) event.preventDefault()
    else handleClick(event)
  }
  const goToNext = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (currentPage >= totalPages) event.preventDefault()
    else handleClick(event)
  }

  return (
    <nav className={styles.container}>
      <ul className={styles.pagination__container}>
        <li
          className={[
            [styles.pagination, styles['pagination-arrow']].join(' '),
            currentPage === 1 ? styles['pagination--disabled'] : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <Link
            to={pageLink(Math.max(1, currentPage - 1))}
            className={styles.pagination__link}
            onClick={goToPrev}
            aria-disabled={currentPage === 1}
          >
            <IoChevronBack size={20} />
          </Link>
        </li>
        {pageNumbers.map(number => (
          <li
            key={number}
            className={
              number === currentPage
                ? [styles.pagination, styles['pagination--active']].join(' ')
                : styles.pagination
            }
          >
            <Link
              onClick={handleClick}
              aria-current={number === currentPage ? 'page' : undefined}
              to={pageLink(number)}
              className={styles.pagination__link}
            >
              {number}
            </Link>
          </li>
        ))}
        <li
          className={[
            [styles.pagination, styles['pagination-arrow']].join(' '),
            currentPage >= totalPages ? styles['pagination--disabled'] : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <Link
            to={pageLink(Math.max(1, Math.min(totalPages, currentPage + 1)))}
            className={styles.pagination__link}
            onClick={goToNext}
            aria-disabled={currentPage >= totalPages}
          >
            <IoChevronForward size={20} />
          </Link>
        </li>
      </ul>
    </nav>
  )
}

export default Pagination
