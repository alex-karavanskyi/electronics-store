import type { CSSProperties } from 'react'

import {
  FilterFields,
  FilterName,
  HandleFiltersFn,
} from '@/shared/types/productsType'
import { formatPrice } from '@/shared/utils/formatPrice'

import styles from './Price.module.scss'

interface PriceProps extends Pick<
  FilterFields,
  'price' | 'min_price' | 'max_price'
> {
  handleFilters: HandleFiltersFn
}

const Price: React.FC<PriceProps> = ({
  price,
  min_price,
  max_price,
  handleFilters,
}) => {
  const progress =
    max_price > min_price
      ? Math.max(
          0,
          Math.min(100, ((price - min_price) / (max_price - min_price)) * 100)
        )
      : 0

  const rangeStyle = { '--price-progress': `${progress}%` } as CSSProperties

  return (
    <div className={styles.container}>
      <div className={styles.price__header}>
        <h5>price</h5>
        <p>{formatPrice(price)}</p>
      </div>
      <input
        aria-label="Maximum price"
        aria-valuetext={formatPrice(price)}
        type="range"
        name="price"
        min={min_price}
        max={max_price}
        value={price}
        className={styles.price__input}
        style={rangeStyle}
        onChange={e => handleFilters(FilterName.Price, Number(e.target.value))}
      />
    </div>
  )
}

export default Price
