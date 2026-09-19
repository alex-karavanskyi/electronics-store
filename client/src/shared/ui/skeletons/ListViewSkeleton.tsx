import styles from './ListViewSkeleton.module.scss'

const ListViewSkeleton = () => {
  return Array.from({ length: 5 }).map((_, i) => (
    <div className={styles.container} key={i}>
      <div className={styles['list__view-skeleton-img']} />
      <div className={styles['list__view-skeleton-info']}>
        <div className={styles['list__view-skeleton-title']} />
        <div className={styles['list__view-skeleton-price']} />
        <div className={styles['list__view-skeleton-desc']} />
        <div className={styles['list__view-skeleton-btn']} />
      </div>
    </div>
  ))
}

export default ListViewSkeleton
