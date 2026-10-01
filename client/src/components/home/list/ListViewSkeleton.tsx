import cardStyles from './ListView.module.scss'
import styles from './ListViewSkeleton.module.scss'

const ListViewSkeleton = ({ count = 7 }: { count?: number }) => {
  return Array.from({ length: count }).map((_, i) => (
    <div
      className={`${cardStyles['list__view-article']} ${styles.container}`}
      key={i}
      aria-hidden="true"
    >
      <div
        className={`${cardStyles['list__view-image']} ${styles['list__view-skeleton-img']}`}
      />
      <div
        className={`${cardStyles['list__view-products-info']} ${styles['list__view-skeleton-info']}`}
      >
        <div className={styles['list__view-skeleton-header']}>
          <div className={styles['list__view-skeleton-title']} />
          <div className={styles['list__view-skeleton-favorite']} />
        </div>
        <div className={cardStyles['list__view-price-cart']}>
          <div className={styles['list__view-skeleton-price']} />
          <div className={styles['list__view-skeleton-cart']} />
        </div>
        <p
          className={`${cardStyles['list__view-products-description']} ${styles['list__view-skeleton-desc']}`}
        >
          {/* Reserve space for the same 150-character excerpt as a product. */}
          {'Product information is loading. '.repeat(5).slice(0, 150)}...
        </p>
        <div
          className={`${cardStyles['list__view-products-btn-details']} ${styles['list__view-skeleton-btn']}`}
        >
          Details
        </div>
      </div>
    </div>
  ))
}

export default ListViewSkeleton
