import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useDebouncedCallback } from 'use-debounce'
import { RxCross2 } from 'react-icons/rx'
import { useProductFilters } from '@/shared/hooks/useProductFilters'
import { FilterName, HandleFiltersFn } from '@/shared/types/productsType'
import styles from './Search.module.scss'
interface SearchProps {
  handleFilters: HandleFiltersFn
}
const Search = ({ handleFilters }: SearchProps) => {
  const { key } = useLocation()
  const { filters } = useProductFilters()
  const [text, setText] = useState(filters.text)
  const apply = useDebouncedCallback(
    (value: string) => handleFilters(FilterName.Text, value),
    500
  )
  useEffect(() => {
    setText(filters.text)
    apply.cancel()
  }, [key, filters.text, apply])
  useEffect(() => () => apply.cancel(), [apply])
  const clearSearch = () => {
    apply.cancel()
    setText('')
    handleFilters(FilterName.Text, '')
  }
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
        onChange={e => {
          setText(e.target.value)
          apply(e.target.value)
        }}
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
