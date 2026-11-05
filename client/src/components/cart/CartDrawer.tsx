import { useEffect } from 'react'
import { toast } from 'sonner'
import { closeCart, selectCartQuantity } from '@/redux/features/cartSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import Modal from '@/shared/ui/Modal'

import styles from './CartDrawer.module.scss'
import CartPanel from './CartPanel'

const CartDrawer = () => {
  const dispatch = useAppDispatch()
  const { isOpen, items } = useAppSelector(state => state.cart)
  const totalQuantity = useAppSelector(selectCartQuantity)

  useEffect(() => {
    if (!isOpen) return
    // The open cart confirms additions itself; keep its checkout button clear.
    for (const notification of toast.getToasts()) {
      if (
        typeof notification.id === 'string' &&
        notification.id.startsWith('cart-')
      )
        toast.dismiss(notification.id)
    }
  }, [isOpen])

  const totalPrice = items.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  )

  if (!isOpen) return null

  return (
    <Modal
      className={styles.backdrop}
      labelledBy="cart-title"
      describedBy={items.length === 0 ? 'cart-empty' : undefined}
      onClose={() => dispatch(closeCart())}
    >
      <CartPanel
        items={items}
        totalQuantity={totalQuantity}
        totalPrice={totalPrice}
      />
    </Modal>
  )
}

export default CartDrawer
