import { Link } from 'react-router-dom'

import { HiOutlineShoppingBag } from 'react-icons/hi2'

import { closeCart } from '@/redux/features/cartSlice'
import { useAppDispatch } from '@/redux/hooks'

import styles from './EmptyCart.module.scss'

const EmptyCart = () => {
  const dispatch = useAppDispatch()

  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <HiOutlineShoppingBag />
      </div>
      <h3>Your cart is empty</h3>
      <p id="cart-empty">
        Add something you like and it will stay here for your next visit.
      </p>
      <Link to="/" onClick={() => dispatch(closeCart())}>
        Explore products
      </Link>
    </div>
  )
}

export default EmptyCart
