import cardStyles from './GridView.module.scss'
import styles from './GridViewSkeleton.module.scss'

const GridViewSkeleton = () => {
  return Array.from({ length: 6 }).map((_, i) => (
    <div
      className={`${cardStyles['grid__view-product']} ${styles.container}`}
      key={i}
      aria-hidden="true"
    >
      <div
        className={`${cardStyles['grid__view-products-images']} ${styles['grid__view-skeleton-img']}`}
      />
      <div className={cardStyles['grid__view-footer']}>
        <div className={styles['grid__view-skeleton-title']} />
        <div className={cardStyles['grid__view-price-cart']}>
          <div className={styles['grid__view-skeleton-price']} />
          <div className={styles['grid__view-skeleton-cart']} />
        </div>
      </div>
    </div>
  ))
}

export default GridViewSkeleton
