import { HiOutlineShoppingCart } from 'react-icons/hi2'
import styled from 'styled-components'

const CartButton = () => {
  return (
    <StyledButton>
      <HiOutlineShoppingCart />
    </StyledButton>
  )
}

const StyledButton = styled.button`
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;

  svg {
    width: 1.3rem;
    height: 1.3rem;
    color: var(--clr-primary-5);
    transition:
      color 0.2s ease,
      transform 0.2s ease;
  }

  &:hover svg {
    color: var(--clr-primary-4);
    transform: scale(1.15);
  }
`
export default CartButton
