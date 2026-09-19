import Modal from '@/shared/ui/Modal'
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
  handleFilters: HandleFiltersFn
  handleClearButton: HandleClearButtonFn
  setIsSidebarOpen: (value: boolean) => void
}

const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  category,
  price,
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
        <Modal
          label="Filters"
          className={styles.sidebarOverlay}
          onClose={() => setIsSidebarOpen(false)}
        >
          <div
            className={[styles.sidebarContent, styles['right']]
              .filter(Boolean)
              .join(' ')}
            onClick={e => e.stopPropagation()}
          >
            <button type="button" onClick={() => setIsSidebarOpen(false)}>
              Close filters
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
            <button type="button" onClick={() => setIsSortOpen(false)}>
              Close sorting
            </button>
            <Sort handleFilters={handleFilters} />
          </div>
        </Modal>
      )}
    </>
  )
}

export default Sidebar
