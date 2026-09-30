import { formatPrice } from '@/shared/utils/formatPrice'

import styles from './ProductPrice.module.scss'

type ProductPriceProps = {
  price: number
  variant?: 'compact' | 'detailed'
  as?: 'p' | 'h5'
}

const ProductPrice = ({
  price,
  variant = 'compact',
  as: Tag = 'p',
}: ProductPriceProps) => (
  <Tag
    className={[styles.price, variant === 'detailed' ? styles.detailed : '']
      .filter(Boolean)
      .join(' ')}
  >
    {formatPrice(price)}
  </Tag>
)

export default ProductPrice
