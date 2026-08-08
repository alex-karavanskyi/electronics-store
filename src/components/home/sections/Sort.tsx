'use client'
import { useEffect } from 'react'

import { BsFillGridFill, BsList } from 'react-icons/bs'
import styled from 'styled-components'

import { setGridView, setListView } from '@/redux/features/filterSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { device } from '@/shared/constants/device'
import { FilterName, HandleFiltersFn } from '@/shared/types/productsType'
import { containerStyles } from '@/shared/ui/styles/containerStyles'

interface SortProps {
  handleFilters: HandleFiltersFn
}

const Sort: React.FC<SortProps> = ({ handleFilters }) => {
  const {
    filtered_products: products,
    grid_view,
    sort,
  } = useAppSelector(store => store.filter)

  const { products_loading: loading } = useAppSelector(store => store.products)

  const dispatch = useAppDispatch()

  useEffect(() => {
    const syncView = (e: StorageEvent) => {
      if (e.key === 'grid_view') {
        if (e.newValue === 'true') {
          dispatch(setGridView())
        } else {
          dispatch(setListView())
        }
      }
    }
    window.addEventListener('storage', syncView)
    return () => window.removeEventListener('storage', syncView)
  }, [dispatch])

  return (
    <Container>
      <div className="sort__container">
        <div className="sort__btn" role="group" aria-label="View mode toggle">
          <button
            type="button"
            className={`${grid_view ? 'sort__btn-active' : ''}`}
            onClick={() => dispatch(setGridView())}
            aria-label="Grid view"
            aria-pressed={grid_view}
          >
            <BsFillGridFill />
          </button>
          <button
            type="button"
            className={`${!grid_view ? 'sort__btn-active' : ''}`}
            onClick={() => dispatch(setListView())}
            aria-label="List view"
            aria-pressed={!grid_view}
          >
            <BsList />
          </button>
        </div>
        <p className="sort__title">
          {loading ? 'loading…' : `${products.length} products found`}
        </p>
        <hr />
        <div className="sort__select-wrapper">
          <label htmlFor="sort-select" className="sort__label">
            Sort by:
          </label>
          <select
            name="sort"
            id="sort"
            className="sort__select"
            value={sort}
            onChange={e => handleFilters(FilterName.Sort, e.target.value)}
          >
            <option value="price-lowest">price (lowest)</option>
            <option value="price-highest">price (highest)</option>
            <option value="name-a">name (a-z)</option>
            <option value="name-z">name (z-a)</option>
          </select>
        </div>
      </div>
    </Container>
  )
}

const Container = styled.div`
  ${containerStyles}
  padding-left: 1rem;
  padding-right: 1rem;

  .sort__btn {
    display: none;
  }

  .sort__container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 0 0 1rem;
  }

  .sort__title {
    text-transform: capitalize;
    color: var(--ink);
    font-weight: 500;
  }

  .sort__label {
    text-transform: capitalize;
    color: var(--ink-soft);
    font-weight: 500;
    font-size: 0.95rem;
    margin-right: 0.5rem;
  }

  .sort__select-wrapper {
    width: max-content;
    position: relative;
  }

  .sort__select {
    appearance: none;
    background: white;
    border: 1px solid var(--line);
    border-radius: 77px;
    padding: 0.65rem 1rem;
    font-size: 0.95rem;
    color: var(--ink);
    cursor: pointer;
    box-shadow:
      inset 0 1px 0 var(--clr-secondary-6),
      0 8px 24px rgba(2, 6, 23, 0.25);
    backdrop-filter: blur(10px);
    transition: var(--transition);

    &:hover,
    &:focus {
      border-color: var(--clr-secondary-10);
      background: white;
      box-shadow:
        0 0 0 3px var(--clr-secondary-2),
        0 10px 30px rgba(0, 0, 0, 0.3);
      outline: none;
    }

    option {
      background-color: white;
      color: var(--ink);
    }
  }

  @media ${device.tablet} {
    .sort__btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem;
      background: white;
      border: 1px solid var(--line);
      border-radius: 999px;
      box-shadow: inset 0 1px 0 var(--clr-secondary-2);
      backdrop-filter: blur(10px);

      button {
        background: transparent;
        border: 1px solid transparent;
        color: var(--ink-soft);
        width: 2.1rem;
        height: 2.1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        cursor: pointer;
        transition:
          background 0.25s ease,
          color 0.25s ease,
          transform 0.25s ease,
          box-shadow 0.25s ease;

        &:hover:not(.sort__btn-active) {
          background: var(--clr-secondary-3);
          color: var(--ink);
          transform: translateY(-1px);
        }

        &.sort__btn-active {
          background: var(--navy);
          color: #f8fafc;
          box-shadow: 0 8px 18px rgba(16, 42, 53, 0.18);
          border-color: var(--clr-secondary-7);
        }

        &.sort__btn-active:hover {
          background: var(--copper);
          transform: translateY(-1px);
        }
      }
    }
    .sort__container {
      display: grid;
      grid-template-columns: auto auto 1fr auto;
      align-items: center;
      column-gap: 2rem;
    }
  }

  @media ${device.desktop} {
    padding-left: 0;
    padding-right: 0;
  }
`

export default Sort
