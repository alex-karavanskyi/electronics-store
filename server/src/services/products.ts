import type {
  CreateProductInput,
  UpdateProductInput,
} from '../validation/productInput.js'

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

export interface ProductWrites {
  create(input: CreateProductInput, actor: ProductActor): Promise<Product>
  update(
    id: string,
    input: UpdateProductInput,
    actor: ProductActor
  ): Promise<Product>
  remove(id: string, actor: ProductActor): Promise<void>
}

export type ProductActor = { userId: string; role: 'user' | 'admin' }

export interface OwnedProductsService {
  listOwned(userId: string, signal?: AbortSignal): Promise<Product[]>
}

export type AdminProduct = {
  product: Product
  ownerId: string | null
  createdAt: string | null
  notification?: {
    channel?: 'telegram' | null
    status: 'pending' | 'sent' | 'failed'
    attempts: number
    errorCode: string | null
    nextAttemptAt: string | null
    leaseUntil: string | null
  } | null
}

export interface AdminProductsService {
  listForAdmin(signal?: AbortSignal): Promise<AdminProduct[]>
}
