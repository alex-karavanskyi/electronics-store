import { useState } from 'react'

import MobileCatalogControls from './filters/MobileCatalogControls'
import { useCatalog } from '@/components/home/hooks/useCatalog'
import { useFilters } from '@/components/home/hooks/useFilters'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

const MobileCatalogControlsContainer = () => {
  const isMobile = useIsMobile()
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const { handleFilters, handleClearButton } = useFilters()
  const {
    total,
    isPending: isLoading,
    sort,
    filters: { category, price, minPrice, min_price, max_price },
  } = useCatalog()

  return (
    <>
      {isMobile && (
        <MobileCatalogControls
          total={total}
          isLoading={isLoading}
          sort={sort}
          category={category}
          price={price}
          minPrice={minPrice}
          min_price={min_price}
          max_price={max_price}
          isFiltersOpen={isFiltersOpen}
          setIsFiltersOpen={setIsFiltersOpen}
          handleFilters={handleFilters}
          handleClearButton={handleClearButton}
        />
      )}
    </>
  )
}

export default MobileCatalogControlsContainer
