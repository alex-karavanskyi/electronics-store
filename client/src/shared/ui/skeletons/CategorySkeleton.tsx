import styles from './CategorySkeleton.module.scss'

const SkeletonList = () => (
  <>
    <div className={styles.skeletonButton} />
    <div className={styles.skeletonButton} />
    <div className={styles.skeletonButton} />
    <div className={styles.skeletonButton} />
  </>
)

export default SkeletonList
