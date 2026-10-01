import Modal from '@/shared/ui/Modal'
import { useState } from 'react'
import { HiOutlineXMark } from 'react-icons/hi2'
import type { Sorting } from '@/shared/filters/productFilters'

import ClearButton from './ClearButton'
import Price from './Price'
import Search from './Search'
import Category from './Category'
import Sort from './Sort'
import {
  FilterFields,
  HandleClearButtonFn,
  HandleFiltersFn,
} from './filterTypes'

import styles from './MobileCatalogControls.module.scss'

interface MobileCatalogControlsProps extends FilterFields {
  total: number
  isLoading: boolean
  sort: Sorting
  isFiltersOpen: boolean
  handleFilters: HandleFiltersFn
  handleClearButton: HandleClearButtonFn
  setIsFiltersOpen: (value: boolean) => void
}

const MobileCatalogControls: React.FC<MobileCatalogControlsProps> = ({
  isFiltersOpen,
  total,
  isLoading,
  sort,
  category,
  price,
  min_price,
  max_price,
  handleFilters,
  handleClearButton,
  setIsFiltersOpen,
}) => {
  const [isSortOpen, setIsSortOpen] = useState(false)

  return (
    <>
      <aside className={styles.conteiner}>
        <button
          className={styles.mobileFiltersToggle}
          onClick={() => setIsFiltersOpen(true)}
        >
          Filters
        </button>
        <hr className={styles.horizontalLine} />
        <button
          className={styles.mobileFiltersToggle}
          onClick={() => setIsSortOpen(true)}
        >
          Sort
        </button>
      </aside>

      {isFiltersOpen && (
        <Modal
          label="Filters"
          className={styles.sidebarOverlay}
          onClose={() => setIsFiltersOpen(false)}
        >
          <div
            className={[styles.sidebarContent, styles['right']]
              .filter(Boolean)
              .join(' ')}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsFiltersOpen(false)}
            >
              Close filters
              <HiOutlineXMark aria-hidden="true" focusable="false" />
            </button>
            <Category
              selectedCategories={category}
              handleFilters={handleFilters}
            />
            <Search handleFilters={handleFilters} />
            <Price
              price={price}
              min_price={min_price}
              max_price={max_price}
              handleFilters={handleFilters}
            />
            <ClearButton handleClearButton={handleClearButton} />
          </div>
        </Modal>
      )}

      {isSortOpen && (
        <Modal
          label="Sort products"
          className={styles.sidebarOverlay}
          onClose={() => setIsSortOpen(false)}
        >
          <div
            className={[styles.sidebarContent, styles['left']]
              .filter(Boolean)
              .join(' ')}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsSortOpen(false)}
            >
              Close sorting
              <HiOutlineXMark aria-hidden="true" focusable="false" />
            </button>
            <Sort
              total={total}
              isLoading={isLoading}
              sort={sort}
              handleFilters={handleFilters}
            />
          </div>
        </Modal>
      )}
    </>
  )
}

export default MobileCatalogControls
