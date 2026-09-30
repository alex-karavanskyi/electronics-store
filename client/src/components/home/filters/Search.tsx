import { RxCross2 } from 'react-icons/rx'

import { useProductSearch } from '@/components/home/hooks/useProductSearch'
import type { HandleFiltersFn } from './filterTypes'

import styles from './Search.module.scss'

type SearchProps = {
  handleFilters: HandleFiltersFn
}

const Search = ({ handleFilters }: SearchProps) => {
  const { text, changeText, clearSearch } = useProductSearch(handleFilters)

  return (
    <div className={styles.container}>
      <input
        aria-label="Search products"
        data-cy="search"
        type="search"
        name="text"
        placeholder="Search"
        className={styles.search__input}
        value={text}
        onChange={event => changeText(event.currentTarget.value)}
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
