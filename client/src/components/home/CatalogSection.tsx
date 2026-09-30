import type { CSSProperties } from 'react'

import { useAppSelector } from '@/redux/hooks'
import { useCatalog } from '@/components/home/hooks/useCatalog'
import { useFilters } from '@/components/home/hooks/useFilters'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useReservedProductsHeight } from '@/components/home/hooks/useReservedProductsHeight'

import RequestError from '@/shared/ui/RequestError'

import CatalogFiltersPanel from './filters/CatalogFiltersPanel'
import Sort from './filters/Sort'
import ProductResults from './ProductResults'
import styles from './CatalogSection.module.scss'

const CatalogSection = () => {
  const isMobile = useIsMobile()
  const { handleFilters, handleClearButton } = useFilters()

  const {
    products,
    total,
    pageSize,
    isPending: isLoading,
    isLoadingError,
    isFetching,
    refetch,
    sort,
    filters,
  } = useCatalog()
  const isGridView = useAppSelector(store => store.catalogView.grid_view)
  const { productsContentRef, reservedProductsHeight } =
    useReservedProductsHeight({ isMobile, isGridView })

  const results = (
    <ProductResults
      products={products}
      total={total}
      pageSize={pageSize}
      isLoading={isLoading}
      isGridView={isGridView}
    />
  )

  let content = results

  if (isLoadingError) {
    content = (
      <RequestError
        message="Unable to load products. Please try again."
        onRetry={() => {
          void refetch()
        }}
        isRetrying={isFetching}
      />
    )
  } else if (!isMobile) {
    content = (
      <div className={styles.catalogSection}>
        <header className={styles.collectionHeader}>
          <div>
            <span>THE VOLT EDIT</span>
            <h2>Find the tech that fits.</h2>
          </div>
          <p>
            From everyday essentials to powerful devices for work and play —
            compare the details and choose technology that works for you.
          </p>
        </header>
        <section className={styles.catalogShell}>
          <CatalogFiltersPanel
            filters={filters}
            handleFilters={handleFilters}
            handleClearButton={handleClearButton}
          />

          <div
            className={styles.productsPanel}
            style={
              {
                '--reserved-products-height': reservedProductsHeight + 'px',
              } as CSSProperties
            }
          >
            <div className={styles.productsContent} ref={productsContentRef}>
              <Sort
                total={total}
                isLoading={isLoading}
                sort={sort}
                handleFilters={handleFilters}
              />
              {results}
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <section
      id="collection"
      className={styles.catalogAnchor}
      aria-label="Product catalog"
      tabIndex={-1}
    >
      {content}
    </section>
  )
}

export default CatalogSection
