import Image from 'next/image'
import Link from 'next/link'

import { HiMinus, HiOutlineTrash, HiPlus } from 'react-icons/hi2'

import {
  CartItem as CartItemType,
  closeCart,
  decrementQuantity,
  incrementQuantity,
  removeFromCart,
} from '@/redux/features/cartSlice'
import { useAppDispatch } from '@/redux/hooks'
import { formatPrice } from '@/shared/utils/formatPrice'

import styles from './CartContents.module.scss'

interface CartContentsProps {
  items: CartItemType[]
}

const CartContents = ({ items }: CartContentsProps) => {
  const dispatch = useAppDispatch()

  return (
    <ul className={styles.items} aria-label="Products in cart">
      {items.map(({ product, quantity }) => (
        <li className={styles.cartItem} key={product.id}>
          <div className={styles.productImage}>
            <Image src={product.image} alt="" width={112} height={112} />
          </div>
          <div className={styles.itemDetails}>
            <Link
              href={`/product/${product.id}`}
              onClick={() => dispatch(closeCart())}
            >
              {product.name}
            </Link>
            <p className={styles.itemPrice}>{formatPrice(product.price)}</p>
            <div className={styles.itemActions}>
              <div
                className={styles.quantity}
                aria-label={`Quantity of ${product.name}`}
              >
                <button
                  type="button"
                  onClick={() => dispatch(decrementQuantity(product.id))}
                  aria-label={`Decrease quantity of ${product.name}`}
                >
                  <HiMinus />
                </button>
                <output aria-live="polite">{quantity}</output>
                <button
                  type="button"
                  onClick={() => dispatch(incrementQuantity(product.id))}
                  aria-label={`Increase quantity of ${product.name}`}
                >
                  <HiPlus />
                </button>
              </div>
              <button
                className={styles.removeButton}
                type="button"
                onClick={() => dispatch(removeFromCart(product.id))}
                aria-label={`Remove ${product.name} from cart`}
              >
                <HiOutlineTrash />
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default CartContents
