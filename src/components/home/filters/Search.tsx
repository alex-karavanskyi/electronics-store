'use client'
import { RxCross2 } from 'react-icons/rx'

import { useAppSelector } from '@/redux/hooks'
import { FilterName, HandleFiltersFn } from '@/shared/types/productsType'

import styles from './Search.module.scss'

interface SearchProps {
  handleFilters: HandleFiltersFn
}

const Search: React.FC<SearchProps> = ({ handleFilters }) => {
  const clearSearch = () => handleFilters(FilterName.Text, '')

  const text = useAppSelector(state => state.filter.filters.text)

  return (
    <div className={styles.container}>
      <input
        data-cy="search"
        type="search"
        name="text"
        placeholder="Search"
        className={styles.search__input}
        value={text}
        onChange={e => handleFilters(FilterName.Text, e.target.value)}
      />
      <button
        type="button"
        className={styles.search__clear}
        onClick={clearSearch}
        aria-label="Clear search"
      >
        <RxCross2 size={18} />
      </button>
    </div>
  )
}

export default Search
