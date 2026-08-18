'use client'
import { HiOutlineShoppingCart } from 'react-icons/hi2'
import styled from 'styled-components'

import { addToCart } from '@/redux/features/cartSlice'
import { useAppDispatch } from '@/redux/hooks'
import { Product } from '@/shared/types/productsType'

interface CartButtonProps {
  product: Product
}

const CartButton = ({ product }: CartButtonProps) => {
  const dispatch = useAppDispatch()

  const handleAddToCart = () => {
    dispatch(addToCart(product))
  }

  return (
    <StyledButton
      type="button"
      onClick={handleAddToCart}
      aria-label={`Add ${product.name} to cart`}
    >
      <HiOutlineShoppingCart />
    </StyledButton>
  )
}

const StyledButton = styled.button`
  display: grid;
  place-items: center;
  width: 2.45rem;
  height: 2.45rem;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--porcelain);
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;

  svg {
    width: 1.3rem;
    height: 1.3rem;
    color: var(--navy);
    transition:
      color 0.2s ease,
      transform 0.2s ease;
  }

  &:hover svg {
    color: white;
    transform: scale(1.15);
  }

  &:hover {
    background: var(--copper);
    border-color: var(--copper);
  }

  &:active {
    transform: scale(0.94);
  }
`
export default CartButton
