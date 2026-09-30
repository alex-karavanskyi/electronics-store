import ClearButton from './ClearButton'
import Price from './Price'
import Search from './Search'
import {
  FilterFields,
  HandleClearButtonFn,
  HandleFiltersFn,
} from './filterTypes'

import styles from './Filters.module.scss'

interface FiltersProps extends Pick<
  FilterFields,
  'price' | 'min_price' | 'max_price'
> {
  handleFilters: HandleFiltersFn
  handleClearButton: HandleClearButtonFn
}

const Filters: React.FC<FiltersProps> = ({
  price,
  min_price,
  max_price,
  handleFilters,
  handleClearButton,
}) => {
  return (
    <aside className={styles.container}>
      <h5 className={styles.sectionTitle}>Search & price</h5>
      <Search handleFilters={handleFilters} />
      <Price
        price={price}
        min_price={min_price}
        max_price={max_price}
        handleFilters={handleFilters}
      />
      <ClearButton handleClearButton={handleClearButton} />
    </aside>
  )
}

export default Filters
