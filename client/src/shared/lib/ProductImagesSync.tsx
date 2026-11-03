import { useEffect } from 'react'
import { removeFromCart, updateCartProduct } from '@/redux/features/cartSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { useProduct } from '@/shared/hooks/useProducts'
import { ApiError } from '@/shared/api/http'
import { sameProduct } from '@/shared/utils/sameProduct'

function ProductImageSync({ id }: { id: string }) {
  const dispatch = useAppDispatch()
  const { data, error, isSuccess, isFetching } = useProduct(id, true)
  const cartProduct = useAppSelector(
    state => state.cart.items.find(item => item.product.id === id)?.product
  )

  useEffect(() => {
    if (!cartProduct || isFetching) return
    if (
      (error instanceof ApiError && error.status === 404) ||
      (isSuccess && data === null)
    ) {
      dispatch(removeFromCart(id))
      return
    }
    if (!isSuccess || !data || data.id !== id) return
    if (!sameProduct(cartProduct, data)) dispatch(updateCartProduct(data))
  }, [cartProduct, data, error, isSuccess, isFetching, id, dispatch])

  return null
}

export default function ProductImagesSync() {
  const { items, isHydrated } = useAppSelector(state => state.cart)
  const ids = new Set(isHydrated ? items.map(item => item.product.id) : [])
  return (
    <>
      {Array.from(ids, id => (
        <ProductImageSync key={id} id={id} />
      ))}
    </>
  )
}
