import { motion } from 'framer-motion'

import { useProducts } from '@/shared/hooks/useProducts'
import { FilterName, HandleFiltersFn } from './filterTypes'
import CategorySkeleton from './CategorySkeleton'
import { getProductCategories } from './getProductCategories'

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
  const categories = getProductCategories(data ?? [])

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
          <CategorySkeleton />
        </div>
      ) : !error && categories.length === 0 ? (
        <p>No categories available.</p>
      ) : (
        categories.map(category => {
          const isActive = selectedCategories.includes(category)

          return (
            <motion.label
              className={[styles.categoryLabel, isActive ? styles.active : '']
                .filter(Boolean)
                .join(' ')}
              key={category}
              data-cy="category"
              whileTap={{ scale: 0.95 }}
            >
              <input
                className={styles.categoryInput}
                type="checkbox"
                checked={isActive}
                onChange={() => handleFilters(FilterName.Category, category)}
              />
              <span
                className={[
                  styles.checkboxIndicator,
                  isActive ? styles.active : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              />
              <span className={styles.labelText}>{category}</span>
            </motion.label>
          )
        })
      )}
    </nav>
  )
}

export default Category
