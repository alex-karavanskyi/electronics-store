import type {
  FilterFields,
  HandleClearButtonFn,
  HandleFiltersFn,
} from './filterTypes'

import Filters from './Filters'
import Category from './Category'
import styles from '../CatalogSection.module.scss'

type CatalogFiltersPanelProps = {
  filters: FilterFields
  handleFilters: HandleFiltersFn
  handleClearButton: HandleClearButtonFn
}

const CatalogFiltersPanel = ({
  filters,
  handleFilters,
  handleClearButton,
}: CatalogFiltersPanelProps) => (
  <aside className={styles.filterPanel}>
    <h4 className={styles.panelHeading}>Refine your search</h4>
    <Category
      selectedCategories={filters.category}
      handleFilters={handleFilters}
    />
    <Filters
      price={filters.price}
      min_price={filters.min_price}
      max_price={filters.max_price}
      handleFilters={handleFilters}
      handleClearButton={handleClearButton}
    />
  </aside>
)

export default CatalogFiltersPanel
