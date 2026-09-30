import type { CSSProperties } from 'react'

type PriceRangeStyle = CSSProperties & {
  '--price-progress': string
}

export const getPriceRangeStyle = (
  price: number,
  minPrice: number,
  maxPrice: number
): PriceRangeStyle => {
  const progress =
    maxPrice > minPrice
      ? Math.max(
          0,
          Math.min(100, ((price - minPrice) / (maxPrice - minPrice)) * 100)
        )
      : 0

  return { '--price-progress': `${progress}%` }
}
