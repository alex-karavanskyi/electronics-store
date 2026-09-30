import { useEffect } from 'react'
import { updateCartProductImages } from '@/redux/features/cartSlice'
import { updateFavoriteProductImages } from '@/redux/features/favoriteSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { useProduct } from '@/shared/hooks/useProducts'
import type { Product } from '@/shared/types/productSchema'

function needsImages(snapshot: Product | undefined, current: Product) {
  return (
    snapshot &&
    (snapshot.image !== current.image ||
      snapshot.images.length !== current.images.length ||
      snapshot.images.some((url, index) => url !== current.images[index]))
  )
}

function ProductImageSync({ id }: { id: string }) {
  const dispatch = useAppDispatch()
  const { data, isSuccess } = useProduct(id)
  const cartProduct = useAppSelector(
    state => state.cart.items.find(item => item.product.id === id)?.product
  )
  const favoriteProduct = useAppSelector(state =>
    state.favorite.favorites_products.find(product => product.id === id)
  )

  useEffect(() => {
    if (!isSuccess || !data || data.id !== id) return
    const images = { id, image: data.image, images: data.images }
    if (needsImages(cartProduct, data))
      dispatch(updateCartProductImages(images))
    if (needsImages(favoriteProduct, data))
      dispatch(updateFavoriteProductImages(images))
  }, [cartProduct, favoriteProduct, data, isSuccess, id, dispatch])

  return null
}

export default function ProductImagesSync() {
  const { items, isHydrated } = useAppSelector(state => state.cart)
  const favorites = useAppSelector(state => state.favorite.favorites_products)
  const ids = new Set([
    ...(isHydrated ? items.map(item => item.product.id) : []),
    ...favorites.map(product => product.id),
  ])
  return (
    <>
      {Array.from(ids, id => (
        <ProductImageSync key={id} id={id} />
      ))}
    </>
  )
}
