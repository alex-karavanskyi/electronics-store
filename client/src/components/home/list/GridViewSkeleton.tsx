import styles from './GridViewSkeleton.module.scss'

const GridViewSkeleton = () => {
  return Array.from({ length: 6 }).map((_, i) => (
    <div className={styles.container} key={i}>
      <div className={styles['grid__view-skeleton-img']} />
      <div className={styles['grid__view-skeleton-info']}>
        <div className={styles['grid__view-skeleton-title']} />
        <div className={styles['grid__view-skeleton-price']} />
      </div>
    </div>
  ))
}

export default GridViewSkeleton
