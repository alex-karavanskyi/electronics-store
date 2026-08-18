'use client'
import { useRef } from 'react'

import { closeCart } from '@/redux/features/cartSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import useModalInteractions from '@/shared/hooks/useModalInteractions'

import * as S from './CartDrawer.styles'
import CartPanel from './CartPanel'

const CartDrawer = () => {
  const dispatch = useAppDispatch()
  const { isOpen, items } = useAppSelector(state => state.cart)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0)

  const totalPrice = items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  )

  useModalInteractions({
    isOpen,
    initialFocusRef: closeButtonRef,
    onClose: () => dispatch(closeCart()),
  })

  if (!isOpen) return null

  return (
    <S.Backdrop
      onMouseDown={event => {
        if (event.target === event.currentTarget) dispatch(closeCart())
      }}
    >
      <CartPanel
        items={items}
        totalQuantity={totalQuantity}
        totalPrice={totalPrice}
        closeButtonRef={closeButtonRef}
      />
    </S.Backdrop>
  )
}

export default CartDrawer
