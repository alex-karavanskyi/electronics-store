import styles from './CategorySkeleton.module.scss'

const CategorySkeleton = () => (
  <>
    <div className={styles.skeletonButton} />
    <div className={styles.skeletonButton} />
    <div className={styles.skeletonButton} />
    <div className={styles.skeletonButton} />
  </>
)

export default CategorySkeleton
