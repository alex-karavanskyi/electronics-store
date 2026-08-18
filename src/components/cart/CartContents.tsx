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

import * as S from './CartDrawer.styles'

interface CartContentsProps {
  items: CartItemType[]
}

const CartContents = ({ items }: CartContentsProps) => {
  const dispatch = useAppDispatch()

  return (
    <S.Items aria-label="Products in cart">
      {items.map(({ product, quantity }) => (
        <S.CartItem key={product.id}>
          <S.ProductImage>
            <Image src={product.image} alt="" width={112} height={112} />
          </S.ProductImage>
          <S.ItemDetails>
            <Link
              href={`/product/${product.id}`}
              onClick={() => dispatch(closeCart())}
            >
              {product.name}
            </Link>
            <S.ItemPrice>{formatPrice(product.price)}</S.ItemPrice>
            <S.ItemActions>
              <S.Quantity aria-label={`Quantity of ${product.name}`}>
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
              </S.Quantity>
              <S.RemoveButton
                type="button"
                onClick={() => dispatch(removeFromCart(product.id))}
                aria-label={`Remove ${product.name} from cart`}
              >
                <HiOutlineTrash />
              </S.RemoveButton>
            </S.ItemActions>
          </S.ItemDetails>
        </S.CartItem>
      ))}
    </S.Items>
  )
}

export default CartContents
