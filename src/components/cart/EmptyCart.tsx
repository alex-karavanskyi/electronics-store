import Link from 'next/link'

import { HiOutlineShoppingBag } from 'react-icons/hi2'

import { closeCart } from '@/redux/features/cartSlice'
import { useAppDispatch } from '@/redux/hooks'

import * as S from './CartDrawer.styles'

const EmptyCart = () => {
  const dispatch = useAppDispatch()

  return (
    <S.EmptyState>
      <S.EmptyIcon>
        <HiOutlineShoppingBag />
      </S.EmptyIcon>
      <h3>Your cart is empty</h3>
      <p id="cart-empty">
        Add something you like and it will stay here for your next visit.
      </p>
      <Link href="/" onClick={() => dispatch(closeCart())}>
        Explore products
      </Link>
    </S.EmptyState>
  )
}

export default EmptyCart
