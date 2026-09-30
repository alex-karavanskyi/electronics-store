import type { MouseEventHandler } from 'react'
import { Link } from 'react-router-dom'
import type { To } from 'react-router-dom'
import { IoChevronBack, IoChevronForward } from 'react-icons/io5'

import styles from './Pagination.module.scss'

type PaginationArrowProps = {
  direction: 'previous' | 'next'
  to: To
  isDisabled: boolean
  onClick: MouseEventHandler<HTMLAnchorElement>
}

const PaginationArrow = ({
  direction,
  to,
  isDisabled,
  onClick,
}: PaginationArrowProps) => {
  const isPrevious = direction === 'previous'

  return (
    <li
      className={[
        styles.pagination,
        styles['pagination-arrow'],
        isDisabled ? styles['pagination--disabled'] : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Link
        to={to}
        className={styles.pagination__link}
        onClick={onClick}
        aria-disabled={isDisabled}
        aria-label={isPrevious ? 'Previous page' : 'Next page'}
      >
        {isPrevious ? (
          <IoChevronBack size={20} aria-hidden="true" />
        ) : (
          <IoChevronForward size={20} aria-hidden="true" />
        )}
      </Link>
    </li>
  )
}

export default PaginationArrow
