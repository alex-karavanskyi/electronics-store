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
}

const CartPanel = ({ items, totalQuantity, totalPrice }: CartPanelProps) => {
  const dispatch = useAppDispatch()

  return (
    <aside className={styles.panel}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Your selection</p>
          <h2 className={styles.title} id="cart-title">
            Cart <span>{totalQuantity}</span>
          </h2>
        </div>
        <button
          className={styles.closeButton}
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
