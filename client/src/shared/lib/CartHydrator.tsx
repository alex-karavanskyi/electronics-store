import { useEffect } from 'react'
import { hydrateCart } from '@/redux/features/cartSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { loadCartFromStorage } from './cartStorage'
const CartHydrator = () => {
  const dispatch = useAppDispatch()
  const isHydrated = useAppSelector(state => state.cart.isHydrated)
  useEffect(() => {
    if (!isHydrated) dispatch(hydrateCart(loadCartFromStorage()))
  }, [dispatch, isHydrated])
  return null
}
export default CartHydrator
