import { HiOutlineShoppingCart } from 'react-icons/hi2'
import { toast } from 'sonner'

import { addToCart } from '@/redux/features/cartSlice'
import { useAppDispatch } from '@/redux/hooks'
import { Product } from '@/shared/types/productSchema'

import styles from './CartButton.module.scss'

interface CartButtonProps {
  product: Product
}

const CartButton = ({ product }: CartButtonProps) => {
  const dispatch = useAppDispatch()

  const handleAddToCart = () => {
    dispatch(addToCart(product))
    toast.success(`${product.name} added to cart`, { id: `cart-${product.id}` })
  }

  return (
    <button
      className={styles.styledButton}
      type="button"
      onClick={handleAddToCart}
      aria-label={`Add ${product.name} to cart`}
    >
      <HiOutlineShoppingCart />
    </button>
  )
}

export default CartButton
