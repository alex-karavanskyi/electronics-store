'use client'
import { motion } from 'framer-motion'

import { useAppSelector } from '@/redux/hooks'
import { FilterName, HandleFiltersFn } from '@/shared/types/productsType'
import SkeletonList from '@/shared/ui/skeletons/CategorySkeleton'
import { getUniqueValues } from '@/shared/utils/formatPrice'

import styles from './Category.module.scss'

interface CategoryProps {
  selectedCategories: string[]
  handleFilters: HandleFiltersFn
  loading: boolean
}

const Category: React.FC<CategoryProps> = ({
  selectedCategories,
  handleFilters,
  loading,
}) => {
  const { all_products } = useAppSelector(store => store.filter)
  const categories = getUniqueValues(all_products, 'category')

  return (
    <nav className={styles.container}>
      {loading ? (
        <SkeletonList />
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
