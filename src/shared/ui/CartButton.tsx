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
  display: grid;
  place-items: center;
  width: 2.45rem;
  height: 2.45rem;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--porcelain);
  cursor: pointer;

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
`
export default CartButton
