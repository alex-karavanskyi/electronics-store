'use client'
import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

import {
  Category,
  Filters,
  GridView,
  ListView,
  Pagination,
  Sort,
} from '@/components/home'
import { useAppSelector } from '@/redux/hooks'
import { useCatalog } from '@/shared/hooks/useCatalog'
import { useFilters } from '@/shared/hooks/useFilters'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

import styles from './ProductList.module.scss'

const postsPerPage = 6

const ProductList = () => {
  const isMobile = useIsMobile()
  const productsContentRef = useRef<HTMLDivElement>(null)
  const maxProductsHeightRef = useRef(0)
  const [reservedProductsHeight, setReservedProductsHeight] = useState(0)
  const { handleFilters, handleClearButton } = useFilters()
  const { pagination } = useAppSelector(store => store.pagination)

  const {
    products,
    isPending: loading,
    isLoadingError: error,
    refetch,
    filters: { category, price, min_price, max_price },
  } = useCatalog()
  const grid_view = useAppSelector(store => store.filter.grid_view)

  const currentPosts = products.slice(
    (pagination - 1) * postsPerPage,
    pagination * postsPerPage
  )

  useLayoutEffect(() => {
    const content = productsContentRef.current

    if (!content || isMobile) return

    maxProductsHeightRef.current = 0

    const preserveLargestHeight = () => {
      const nextHeight = Math.ceil(content.getBoundingClientRect().height)

      if (nextHeight <= maxProductsHeightRef.current) return

      maxProductsHeightRef.current = nextHeight
      setReservedProductsHeight(nextHeight)
    }

    preserveLargestHeight()

    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(preserveLargestHeight)
    observer.observe(content)

    return () => observer.disconnect()
  }, [grid_view, isMobile])

  if (error) {
    return (
      <div role="alert" className={styles.message}>
        <p>Unable to load products. Please try again.</p>
        <button
          type="button"
          onClick={() => {
            void refetch()
          }}
        >
          Try again
        </button>
      </div>
    )
  }

  if (isMobile) {
    if (!loading && !error && products.length < 1) {
      return (
        <h5 className={styles.message} data-cy="no-results">
          Sorry, no products matched your search...
        </h5>
      )
    }

    if (!grid_view) {
      return <ListView products={products} isLoading={loading} />
    }

    return (
      <>
        <GridView products={currentPosts} isLoading={loading} />
        <Pagination postsPerPage={postsPerPage} totalPosts={products.length} />
      </>
    )
  }

  return (
    <section className={styles.catalogSection} id="collection">
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
        <aside className={styles.filterPanel}>
          <h4 className={styles.panelHeading}>Refine your search</h4>
          <Category
            selectedCategories={category}
            handleFilters={handleFilters}
            loading={loading}
          />
          <Filters
            category={category}
            price={price}
            min_price={min_price}
            max_price={max_price}
            handleFilters={handleFilters}
            handleClearButton={handleClearButton}
          />
        </aside>

        <div
          className={styles.productsPanel}
          style={
            {
              '--reserved-products-height': reservedProductsHeight + 'px',
            } as CSSProperties
          }
        >
          <div className={styles.productsContent} ref={productsContentRef}>
            <Sort handleFilters={handleFilters} />
            {!loading && !error && products.length < 1 ? (
              <h5 className={styles.message} data-cy="no-results">
                Sorry, no products matched your search...
              </h5>
            ) : !grid_view ? (
              <ListView products={products} isLoading={loading} />
            ) : (
              <>
                <GridView products={currentPosts} isLoading={loading} />
                <Pagination
                  postsPerPage={postsPerPage}
                  totalPosts={products.length}
                />
              </>
            )}
          </div>
        </div>
      </section>
    </section>
  )
}

export default ProductList
