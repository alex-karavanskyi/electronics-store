import { useState } from 'react'

import { Sidebar } from '@/components/home/'
import { useCatalog } from '@/shared/hooks/useCatalog'
import { useFilters } from '@/shared/hooks/useFilters'
import { useIsMobile } from '@/shared/hooks/useIsMobile'

const ProductControls = () => {
  const isMobile = useIsMobile()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { handleFilters, handleClearButton } = useFilters()
  const {
    filters: { category, price, min_price, max_price },
  } = useCatalog()

  return (
    <>
      {isMobile && (
        <Sidebar
          category={category}
          price={price}
          min_price={min_price}
          max_price={max_price}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          handleFilters={handleFilters}
          handleClearButton={handleClearButton}
        />
      )}
    </>
  )
}

export default ProductControls
