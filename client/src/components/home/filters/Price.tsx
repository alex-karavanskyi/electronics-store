import {
  FilterFields,
  FilterName,
  HandleFiltersFn,
} from './filterTypes'
import { formatPrice } from '@/shared/utils/formatPrice'
import { getPriceRangeStyle } from './getPriceRangeStyle'

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
        style={getPriceRangeStyle(price, min_price, max_price)}
        onChange={e => handleFilters(FilterName.Price, Number(e.target.value))}
      />
    </div>
  )
}

export default Price
