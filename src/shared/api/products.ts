import axios from 'axios'

import { url } from '@/shared/constants/db'
import { Product } from '@/shared/types/productsType'

export const fetchProducts = async (
  signal?: AbortSignal
): Promise<Product[]> => {
  const { data } = await axios.get<Product[]>(url, { signal })
  return data
}

export const fetchProduct = async (
  id: string,
  signal?: AbortSignal
): Promise<Product> => {
  const { data } = await axios.get<Product>(
    url + '/' + encodeURIComponent(id),
    { signal }
  )
  return data
}
