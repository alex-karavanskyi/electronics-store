export type Product = {
  id: string
  name: string
  price: number
  description: string
  category: string
  images: string[]
  image: string
}

export interface ProductsService {
  list(signal?: AbortSignal): Promise<Product[]>
  get(id: string, signal?: AbortSignal): Promise<Product>
}
