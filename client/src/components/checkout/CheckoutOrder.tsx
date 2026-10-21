import { HiOutlineShoppingBag } from 'react-icons/hi2'
import CartContents from '@/components/cart/CartContents'
import type { CartItem } from '@/redux/features/cartSlice'
import { formatPrice } from '@/shared/utils/formatPrice'
import styles from './CheckoutOrder.module.scss'

interface CheckoutOrderProps {
  items: CartItem[]
  quantity: number
  isValid: boolean
  isSubmitting: boolean
  submitted: boolean
}

export default function CheckoutOrder({
  items,
  quantity,
  isValid,
  isSubmitting,
  submitted,
}: CheckoutOrderProps) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )

  return (
    <aside className={styles.order} aria-labelledby="order-title">
      <header className={styles.orderHeader}>
        <h2 id="order-title">Your order</h2>
        <span>
          <HiOutlineShoppingBag /> {quantity}{' '}
          {quantity === 1 ? 'item' : 'items'}
        </span>
      </header>
      <CartContents items={items} />
      <div className={styles.summary}>
        <div>
          <span>Subtotal</span>
          <strong>{formatPrice(subtotal)}</strong>
        </div>
        <div>
          <span>Delivery</span>
          <span>To be confirmed</span>
        </div>
        <div className={styles.total}>
          <span>Order total</span>
          <strong>{formatPrice(subtotal)}</strong>
        </div>
        <p>Excludes any delivery charges, confirmed before payment.</p>
        <button
          className={styles.submit}
          type="submit"
          disabled={!isValid || isSubmitting}
          aria-describedby={!isValid ? 'checkout-hint' : undefined}
        >
          Place order <span aria-hidden="true">↗</span>
        </button>
        {!isValid && (
          <p id="checkout-hint">
            Complete the contact and delivery details to place your order.
          </p>
        )}
        <p className={styles.demo}>
          Demo checkout — no order will be sent or charged.
        </p>
        {submitted && (
          <p className={styles.notice} role="status">
            Your details are ready. This is a demo checkout; no order has
            been placed.
          </p>
        )}
      </div>
    </aside>
  )
}
