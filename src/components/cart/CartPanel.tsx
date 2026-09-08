import { RefObject } from 'react'

import { HiXMark } from 'react-icons/hi2'

import { CartItem, clearCart, closeCart } from '@/redux/features/cartSlice'
import { useAppDispatch } from '@/redux/hooks'
import { formatPrice } from '@/shared/utils/formatPrice'

import CartContents from './CartContents'
import styles from './CartPanel.module.scss'
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
    <aside
      className={styles.panel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-title"
      aria-describedby={items.length === 0 ? 'cart-empty' : undefined}
    >
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Your selection</p>
          <h2 className={styles.title} id="cart-title">
            Cart <span>{totalQuantity}</span>
          </h2>
        </div>
        <button
          className={styles.closeButton}
          ref={closeButtonRef}
          type="button"
          onClick={() => dispatch(closeCart())}
          aria-label="Close cart"
        >
          <HiXMark />
        </button>
      </header>

      {items.length === 0 ? (
        <EmptyCart />
      ) : (
        <>
          <CartContents items={items} />
          <footer className={styles.footer}>
            <button type="button" onClick={() => dispatch(clearCart())}>
              Clear cart
            </button>
            <div className={styles.total}>
              <span>Total</span>
              <strong>{formatPrice(totalPrice)}</strong>
            </div>
            <p>Taxes and delivery are calculated at checkout.</p>
          </footer>
        </>
      )}
    </aside>
  )
}

export default CartPanel
