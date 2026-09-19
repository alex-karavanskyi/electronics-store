import { motion } from 'framer-motion'

import { useProducts } from '@/shared/hooks/useProducts'
import { FilterName, HandleFiltersFn } from '@/shared/types/productsType'
import SkeletonList from '@/shared/ui/skeletons/CategorySkeleton'
import { getUniqueValues } from '@/shared/utils/formatPrice'

import styles from './Category.module.scss'
import RequestError from '@/shared/ui/RequestError'

interface CategoryProps {
  selectedCategories: string[]
  handleFilters: HandleFiltersFn
}

const Category: React.FC<CategoryProps> = ({
  selectedCategories,
  handleFilters,
}) => {
  const { data, isPending, error, isFetching, refetch } = useProducts()
  const all_products = data ?? []
  const categories = getUniqueValues(all_products, 'category')

  return (
    <nav className={styles.container}>
      {error && (
        <RequestError
          message={
            data === undefined
              ? 'Unable to load categories. Please try again.'
              : 'Could not refresh categories. Showing previously loaded categories.'
          }
          onRetry={() => {
            void refetch()
          }}
          isRetrying={isFetching}
          background={data !== undefined}
        />
      )}
      {isPending ? (
        <div role="status" aria-label="Loading categories">
          <span>Loading categories...</span>
          <SkeletonList />
        </div>
      ) : !error && categories.length === 0 ? (
        <p>No categories available.</p>
      ) : (
        categories.map(c => {
          const isActive = selectedCategories.includes(c)

          return (
            <motion.label
              className={[styles.categoryLabel, isActive ? styles.active : '']
                .filter(Boolean)
                .join(' ')}
              key={c}
              data-cy="category"
              whileTap={{ scale: 0.95 }}
            >
              <input
                className={styles.categoryInput}
                type="checkbox"
                checked={isActive}
                onChange={() => handleFilters(FilterName.Category, c)}
              />
              <span
                className={[
                  styles.checkboxIndicator,
                  isActive ? styles.active : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
              <span className={styles.labelText}>{c}</span>
            </motion.label>
          )
        })
      )}
    </nav>
  )
}

export default Category
