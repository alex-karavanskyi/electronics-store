import { useId } from 'react'

import { BsFillGridFill, BsList } from 'react-icons/bs'

import { setGridView, setListView } from '@/redux/features/catalogViewSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { useCatalog } from '@/shared/hooks/useCatalog'
import { useProductFilters } from '@/shared/hooks/useProductFilters'
import { FilterName, HandleFiltersFn } from '@/shared/types/productsType'

import styles from './Sort.module.scss'

interface SortProps {
  handleFilters: HandleFiltersFn
}

const Sort: React.FC<SortProps> = ({ handleFilters }) => {
  const sortId = useId()
  const { grid_view } = useAppSelector(store => store.catalogView)

  const { total, isPending: loading } = useCatalog()
  const { sorting: sort } = useProductFilters()

  const dispatch = useAppDispatch()

  return (
    <div className={styles.container}>
      <div className={styles.sort__container}>
        <div
          className={styles.sort__btn}
          role="group"
          aria-label="View mode toggle"
        >
          <button
            type="button"
            className={grid_view ? styles['sort__btn-active'] : ''}
            onClick={() => dispatch(setGridView())}
            aria-label="Grid view"
            aria-pressed={grid_view}
          >
            <BsFillGridFill />
          </button>
          <button
            type="button"
            className={!grid_view ? styles['sort__btn-active'] : ''}
            onClick={() => dispatch(setListView())}
            aria-label="List view"
            aria-pressed={!grid_view}
          >
            <BsList />
          </button>
        </div>
        <p className={styles.sort__title}>
          {loading ? 'loading…' : `${total} products found`}
        </p>
        <hr />
        <div className={styles['sort__select-wrapper']}>
          <label htmlFor={sortId} className={styles.sort__label}>
            Sort by:
          </label>
          <select
            name="sort"
            id={sortId}
            className={styles.sort__select}
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
    </div>
  )
}

export default Sort
