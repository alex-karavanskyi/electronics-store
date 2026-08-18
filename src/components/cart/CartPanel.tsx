import { RefObject } from 'react'

import { HiXMark } from 'react-icons/hi2'

import { CartItem, clearCart, closeCart } from '@/redux/features/cartSlice'
import { useAppDispatch } from '@/redux/hooks'
import { formatPrice } from '@/shared/utils/formatPrice'

import CartContents from './CartContents'
import * as S from './CartDrawer.styles'
import EmptyCart from './EmptyCart'

interface CartPanelProps {
  items: CartItem[]
  totalQuantity: number
  totalPrice: number
  closeButtonRef: RefObject<HTMLButtonElement>
}

const CartPanel = ({
  items,
  totalQuantity,
  totalPrice,
  closeButtonRef,
}: CartPanelProps) => {
  const dispatch = useAppDispatch()

  return (
    <S.Panel
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-title"
      aria-describedby={items.length === 0 ? 'cart-empty' : undefined}
    >
      <S.Header>
        <div>
          <S.Eyebrow>Your selection</S.Eyebrow>
          <S.Title id="cart-title">
            Cart <span>{totalQuantity}</span>
          </S.Title>
        </div>
        <S.CloseButton
          ref={closeButtonRef}
          type="button"
          onClick={() => dispatch(closeCart())}
          aria-label="Close cart"
        >
          <HiXMark />
        </S.CloseButton>
      </S.Header>

      {items.length === 0 ? (
        <EmptyCart />
      ) : (
        <>
          <CartContents items={items} />
          <S.Footer>
            <button type="button" onClick={() => dispatch(clearCart())}>
              Clear cart
            </button>
            <S.Total>
              <span>Total</span>
              <strong>{formatPrice(totalPrice)}</strong>
            </S.Total>
            <p>Taxes and delivery are calculated at checkout.</p>
          </S.Footer>
        </>
      )}
    </S.Panel>
  )
}

export default CartPanel
