import type { Product } from '@/shared/types/productSchema'

import GridView from './list/GridView'
import ListView from './list/ListView'
import Pagination from './list/Pagination'
import styles from './CatalogSection.module.scss'

type ProductResultsProps = {
  products: Product[]
  total: number
  pageSize: number
  isLoading: boolean
  isGridView: boolean
}

const ProductResults = ({
  products,
  total,
  pageSize,
  isLoading,
  isGridView,
}: ProductResultsProps) => {
  if (!isLoading && products.length === 0) {
    return (
      <h5 className={styles.message} data-cy="no-results">
        Sorry, no products matched your search...
      </h5>
    )
  }

  if (!isGridView) {
    return <ListView products={products} isLoading={isLoading} />
  }

  return (
    <>
      <GridView products={products} isLoading={isLoading} />
      <Pagination pageSize={pageSize} totalItems={total} />
    </>
  )
}

export default ProductResults
