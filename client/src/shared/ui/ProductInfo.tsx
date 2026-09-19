
import { Product } from '@/shared/types/productsType'
import { FavoriteButton } from '@/shared/ui'
import { formatPrice } from '@/shared/utils/formatPrice'

import styles from './ProductInfo.module.scss'

interface ProductInfoProps {
  product: Product
  variant?: 'compact' | 'detailed'
  priceTag?: 'h5' | 'p'
  showHeader?: boolean
  showPrice?: boolean
  showFavorite?: boolean
  className?: string
  favoriteClassName?: string
}

const ProductInfo: React.FC<ProductInfoProps> = ({
  product,
  variant = 'compact',
  priceTag = 'p',
  showHeader = true,
  showPrice = true,
  showFavorite = true,
  className = '',
  favoriteClassName,
}) => {
  const { name, price } = product
  const PriceTag = priceTag
  const isDetailed = variant === 'detailed'

  return (
    <div
      className={[
        styles.container,
        className,
        isDetailed ? styles.detailed : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {showHeader && (
        <div
          className={[styles.header, isDetailed ? styles.detailed : '']
            .filter(Boolean)
            .join(' ')}
        >
          <h5
            className={[styles.name, isDetailed ? styles.detailed : '']
              .filter(Boolean)
              .join(' ')}
          >
            {name}
          </h5>
          {showFavorite && (
            <FavoriteButton product={product} classIcon={favoriteClassName} />
          )}
        </div>
      )}
      {showPrice && (
        <PriceTag className={styles['product__info-price']}>
          {formatPrice(price)}
        </PriceTag>
      )}
    </div>
  )
}

export default ProductInfo
