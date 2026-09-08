'use client'
import { useState } from 'react'

import { Category, ClearButton, Price, Search, Sort } from '@/components/home'
import {
  FilterFields,
  HandleClearButtonFn,
  HandleFiltersFn,
} from '@/shared/types/productsType'

import styles from './Sidebar.module.scss'

interface SidebarProps extends FilterFields {
  isSidebarOpen: boolean
  loading: boolean
  handleFilters: HandleFiltersFn
  handleClearButton: HandleClearButtonFn
  setIsSidebarOpen: (value: boolean) => void
}

const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  category,
  price,
  loading,
  min_price,
  max_price,
  handleFilters,
  handleClearButton,
  setIsSidebarOpen,
}) => {
  const [isSortOpen, setIsSortOpen] = useState(false)

  return (
    <>
      <aside className={styles.conteiner}>
        <button
          className={styles.mobileFiltersToggle}
          onClick={() => setIsSidebarOpen(true)}
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

      {isSidebarOpen && (
        <div
          className={styles.sidebarOverlay}
          onClick={() => setIsSidebarOpen(false)}
        >
          <div
            className={[styles.sidebarContent, styles['right']]
              .filter(Boolean)
              .join(' ')}
            onClick={e => e.stopPropagation()}
          >
            <Category
              selectedCategories={category}
              handleFilters={handleFilters}
              loading={loading}
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
        </div>
      )}

      {isSortOpen && (
        <div
          className={styles.sidebarOverlay}
          onClick={() => setIsSortOpen(false)}
        >
          <div
            className={[styles.sidebarContent, styles['left']]
              .filter(Boolean)
              .join(' ')}
            onClick={e => e.stopPropagation()}
          >
            <Sort handleFilters={handleFilters} />
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar
