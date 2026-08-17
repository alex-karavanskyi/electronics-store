'use client'
import { useLayoutEffect, useRef, useState } from 'react'

import styled from 'styled-components'

import {
  Category,
  Filters,
  GridView,
  ListView,
  Pagination,
  Sort,
} from '@/components/home'
import { useAppSelector } from '@/redux/hooks'
import { device } from '@/shared/constants/device'
import { useFilters } from '@/shared/hooks/useFilters'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { containerStyles } from '@/shared/ui/styles/containerStyles'

const postsPerPage = 6

const ProductList = () => {
  const isMobile = useIsMobile()
  const productsContentRef = useRef<HTMLDivElement>(null)
  const maxProductsHeightRef = useRef(0)
  const [reservedProductsHeight, setReservedProductsHeight] = useState(0)
  const { handleFilters, handleClearButton } = useFilters()
  const { pagination } = useAppSelector(store => store.pagination)

  const { products_loading: loading, products_error: error } = useAppSelector(
    store => store.products
  )
  const {
    filtered_products: products,
    grid_view,
    filters: { category, price, min_price, max_price },
  } = useAppSelector(store => store.filter)

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

  if (isMobile) {
    if (!loading && !error && products.length < 1) {
      return (
        <Message data-cy="no-results">
          Sorry, no products matched your search...
        </Message>
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
    <CatalogSection id="collection">
      <CollectionHeader>
        <div>
          <span>THE VOLT EDIT</span>
          <h2>Find the tech that fits.</h2>
        </div>
        <p>
          From everyday essentials to powerful devices for work and play —
          compare the details and choose technology that works for you.
        </p>
      </CollectionHeader>
      <CatalogShell>
        <FilterPanel>
          <PanelHeading>Refine your search</PanelHeading>
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
        </FilterPanel>

        <ProductsPanel $reservedHeight={reservedProductsHeight}>
          <ProductsContent ref={productsContentRef}>
            <Sort handleFilters={handleFilters} />
            {!loading && !error && products.length < 1 ? (
              <Message data-cy="no-results">
                Sorry, no products matched your search...
              </Message>
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
          </ProductsContent>
        </ProductsPanel>
      </CatalogShell>
    </CatalogSection>
  )
}

const CatalogSection = styled.section`
  padding: 1rem 0 4rem;
  scroll-margin-top: var(--navbar-height);
`

const CollectionHeader = styled.header`
  ${containerStyles}
  display: grid;
  gap: 1.5rem;
  padding: 4rem 1rem 2rem;
  border-bottom: 1px solid var(--line);

  span {
    display: block;
    margin-bottom: 0.75rem;
    color: var(--copper-dark);
    font-family: var(--font-utility);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.13em;
  }

  h2 {
    max-width: 11ch;
    font-size: clamp(2.7rem, 6vw, 5rem);
  }
  p {
    max-width: 37rem;
    line-height: 1.8;
  }

  @media ${device.tablet} {
    grid-template-columns: 1.15fr 0.85fr;
    align-items: end;
    padding: 5.5rem 1.5rem 3rem;
  }
`

const CatalogShell = styled.section`
  ${containerStyles}
  display: grid;
  gap: 1.5rem;
  padding: 2rem 1rem;

  @media ${device.tablet} {
    grid-template-columns: minmax(260px, 300px) minmax(0, 1fr);
    align-items: start;
    gap: 2rem;
    min-height: calc(100svh - var(--navbar-height));
    padding: 3rem 1.5rem;
  }

  @media ${device.desktop} {
    padding: 3.5rem 0 1rem;
  }
`

const FilterPanel = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--line);
  border-radius: 1.25rem;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 16px 40px rgba(16, 42, 53, 0.06);
  backdrop-filter: blur(12px);
  position: sticky;
  top: calc(var(--navbar-height) + 1rem);
`

const PanelHeading = styled.h4`
  color: var(--navy);
  font-size: 1.4rem;
  text-align: left;
`

const ProductsPanel = styled.div<{ $reservedHeight: number }>`
  min-height: ${({ $reservedHeight }) => `${$reservedHeight}px`};
`

const ProductsContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const Message = styled.h5`
  text-align: center;
  padding: 1rem 0 1.5rem;
  text-transform: none;
  color: var(--clr-grey-6);
  font-size: 1rem;
`

export default ProductList
