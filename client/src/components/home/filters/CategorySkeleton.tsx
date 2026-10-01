import styles from './CategorySkeleton.module.scss'
import categoryStyles from './Category.module.scss'

const CategorySkeleton = () => (
  <>
    {Array.from({ length: 4 }, (_, index) => (
      <div
        className={categoryStyles.categoryLabel}
        key={index}
        aria-hidden="true"
      >
        <div className={styles.skeletonCheckbox} />
        <div className={styles.skeletonButton} />
      </div>
    ))}
  </>
)

export default CategorySkeleton
