'use client'
import { useEffect } from 'react'

import Link from 'next/link'

import { IoChevronBack, IoChevronForward } from 'react-icons/io5'
import styled from 'styled-components'

import { numberPagination } from '@/redux/features/paginationSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'

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
    <Container>
      <ul className="pagination__container">
        <li
          className={`pagination pagination-arrow ${currentPage === 1 ? 'pagination--disabled' : ''}`}
        >
          <Link
            href="/"
            className="pagination__link"
            onClick={goToPrev}
            aria-disabled={currentPage === 1}
          >
            <IoChevronBack size={20} />
          </Link>
        </li>
        {pageNumbers.map(number => (
          <li
            key={number}
            className={`${
              number === currentPage
                ? 'pagination pagination--active'
                : 'pagination'
            }`}
          >
            <Link
              onClick={handleClick(number)}
              href="/"
              className="pagination__link"
            >
              {number}
            </Link>
          </li>
        ))}
        <li
          className={`pagination pagination-arrow ${currentPage === totalPages ? 'pagination--disabled' : ''}`}
        >
          <Link
            href="/"
            className="pagination__link"
            onClick={goToNext}
            aria-disabled={currentPage === totalPages}
          >
            <IoChevronForward size={20} />
          </Link>
        </li>
      </ul>
    </Container>
  )
}

const Container = styled.nav`
  padding: 2rem 0;

  .pagination__container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .pagination {
    border: 1px solid var(--clr-grey-4);
    border-radius: 50%;
    overflow: hidden;
    transition: all 0.25s ease;

    &:not(.pagination--active):not(.pagination--disabled):hover {
      border-color: var(--clr-pagination-hover-border);
      background-color: var(--clr-pagination-hover-background);
      transform: translateY(-2px);
    }

    &.pagination--active {
      background-color: var(--navy);
      border-color: var(--navy);

      .pagination__link {
        color: #fff;
      }

      &:hover {
        background-color: var(--copper);
      }
    }

    &.pagination-arrow {
      border: 1px solid transparent;
      background-color: transparent;

      &:not(.pagination--disabled):hover {
        border-color: var(--clr-pagination-hover-border);
        background-color: var(--clr-pagination-hover-background);
      }
    }

    &.pagination--disabled {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }
  }

  .pagination,
  .pagination-arrow {
    width: 2.3rem;
    height: 2.3rem;
  }

  .pagination__link {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    text-decoration: none;
    color: var(--ink);
    transition: color 0.25s ease;
  }

  .pagination-arrow:first-child {
    margin-right: 0.75rem;
  }
  .pagination-arrow:last-child {
    margin-left: 0.75rem;
  }
`

export default Pagination
