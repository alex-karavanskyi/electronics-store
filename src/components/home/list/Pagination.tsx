'use client'
import { useEffect } from 'react'

import Link from 'next/link'

import { IoChevronBack, IoChevronForward } from 'react-icons/io5'

import { numberPagination } from '@/redux/features/paginationSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'

import styles from './Pagination.module.scss'

interface PaginationProducts {
  postsPerPage: number
  totalPosts: number
}

const Pagination: React.FC<PaginationProducts> = ({
  postsPerPage,
  totalPosts,
}) => {
  const { pagination: currentPage } = useAppSelector(store => store.pagination)

  const totalPages = Math.ceil(totalPosts / postsPerPage)
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)

  const dispatch = useAppDispatch()

  const handleClick =
    (pageNumber: number) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
      dispatch(numberPagination(pageNumber))

      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 1100, behavior: 'smooth' })
      }
      event.currentTarget.blur()
    }

  const goToPrev = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (currentPage > 1) handleClick(currentPage - 1)(e)
  }

  const goToNext = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (currentPage < totalPages) handleClick(currentPage + 1)(e)
  }

  useEffect(() => {
    const syncStorage = (e: StorageEvent) => {
      if (e.key === 'pagination' && e.newValue) {
        dispatch(numberPagination(Number(e.newValue)))
      }
    }
    window.addEventListener('storage', syncStorage)
    return () => window.removeEventListener('storage', syncStorage)
  }, [dispatch])

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
            href="/"
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
              onClick={handleClick(number)}
              href="/"
              className={styles.pagination__link}
            >
              {number}
            </Link>
          </li>
        ))}
        <li
          className={[
            [styles.pagination, styles['pagination-arrow']].join(' '),
            currentPage === totalPages ? styles['pagination--disabled'] : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <Link
            href="/"
            className={styles.pagination__link}
            onClick={goToNext}
            aria-disabled={currentPage === totalPages}
          >
            <IoChevronForward size={20} />
          </Link>
        </li>
      </ul>
    </nav>
  )
}

export default Pagination
