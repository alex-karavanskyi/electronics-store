import type { Sorting } from '@/shared/filters/productFilters'

export type FilterFields = {
  category: string[]
  minPrice?: number
  price: number
  min_price: number
  max_price: number
}

export const enum FilterName {
  Category = 'category',
  Price = 'price',
  MinPrice = 'minPrice',
  Text = 'text',
  Sort = 'sort',
}

export type HandleFiltersFn = (
  ...args:
    | [name: FilterName.Category | FilterName.Text, value: string]
    | [name: FilterName.Price | FilterName.MinPrice, value: number]
    | [name: FilterName.Sort, value: Sorting]
) => void

export type HandleClearButtonFn = () => void
