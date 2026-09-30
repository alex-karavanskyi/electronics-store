import { useLayoutEffect, useRef, useState } from 'react'

type ReservedProductsHeightOptions = {
  isMobile: boolean
  isGridView: boolean
}

export const useReservedProductsHeight = ({
  isMobile,
  isGridView,
}: ReservedProductsHeightOptions) => {
  const productsContentRef = useRef<HTMLDivElement>(null)
  const maxProductsHeightRef = useRef(0)
  const [reservedProductsHeight, setReservedProductsHeight] = useState(0)

  useLayoutEffect(() => {
    const content = productsContentRef.current
    if (!content || isMobile) return

    maxProductsHeightRef.current = 0

    const preserveLargestHeight = () => {
      const nextHeight = Math.ceil(content.getBoundingClientRect().height)
      if (nextHeight <= maxProductsHeightRef.current) return

      maxProductsHeightRef.current = nextHeight
      setReservedProductsHeight(nextHeight)
    }

    preserveLargestHeight()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(preserveLargestHeight)
    observer.observe(content)
    return () => observer.disconnect()
  }, [isGridView, isMobile])

  return { productsContentRef, reservedProductsHeight }
}
