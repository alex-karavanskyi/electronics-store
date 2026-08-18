import styled from 'styled-components'

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 5000;
  display: flex;
  justify-content: flex-end;
  background: rgba(9, 25, 31, 0.56);
  backdrop-filter: blur(3px);
  animation: cart-fade-in 0.22s ease-out;

  @keyframes cart-fade-in {
    from {
      background: rgba(9, 25, 31, 0);
      backdrop-filter: blur(0);
    }
  }
`

export const Panel = styled.aside`
  width: min(100%, 31rem);
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--paper);
  box-shadow: -20px 0 60px rgba(9, 25, 31, 0.22);
  animation: cart-slide-in 0.3s cubic-bezier(0.22, 1, 0.36, 1);

  @keyframes cart-slide-in {
    from {
      transform: translateX(100%);
    }
  }
`

export const Header = styled.header`
  min-height: 8.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  color: white;
  background: var(--navy);
`

export const Eyebrow = styled.p`
  margin-bottom: 0.35rem;
  color: rgba(255, 255, 255, 0.58);
  font-family: var(--font-utility);
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
`

export const Title = styled.h2`
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: white;
  font-size: clamp(1.8rem, 5vw, 2.4rem);

  span {
    min-width: 1.7rem;
    height: 1.7rem;
    display: inline-grid;
    place-items: center;
    padding: 0 0.4rem;
    border-radius: 999px;
    background: var(--copper);
    font:
      700 0.75rem Arial,
      sans-serif;
  }
`

export const CloseButton = styled.button`
  width: 2.75rem;
  height: 2.75rem;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 50%;
  color: white;
  background: transparent;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  svg {
    width: 1.45rem;
    height: 1.45rem;
  }
`

export const Items = styled.ul`
  flex: 1;
  overflow-y: auto;
  padding: 0 1.5rem;
  scrollbar-width: thin;
`

export const CartItem = styled.li`
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
  gap: 1rem;
  padding: 1.35rem 0;
  border-bottom: 1px solid var(--line);
`

export const ProductImage = styled.div`
  width: 5.5rem;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 0.9rem;
  background: var(--sand);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

export const ItemDetails = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;

  > a {
    overflow: hidden;
    color: var(--ink);
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const ItemPrice = styled.p`
  margin-top: 0.25rem;
  color: var(--copper-dark);
  font: 0.8rem var(--font-utility);
`

export const ItemActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
`

export const Quantity = styled.div`
  height: 2rem;
  display: inline-grid;
  grid-template-columns: repeat(3, 2rem);
  align-items: center;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--porcelain);

  button {
    height: 100%;
    display: grid;
    place-items: center;
    border: 0;
    color: var(--navy);
    background: transparent;
    cursor: pointer;
  }

  output {
    text-align: center;
    font: 700 0.78rem var(--font-utility);
  }
`

export const RemoveButton = styled.button`
  width: 2rem;
  height: 2rem;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: var(--ink-soft);
  background: transparent;
  cursor: pointer;

  &:hover {
    color: var(--copper-dark);
    background: var(--porcelain);
  }
`

export const Footer = styled.footer`
  padding: 1.25rem 1.5rem max(1.5rem, env(safe-area-inset-bottom));
  border-top: 1px solid var(--line);
  background: var(--porcelain);

  > button {
    margin-bottom: 1rem;
    border: 0;
    border-bottom: 1px solid currentColor;
    color: var(--ink-soft);
    background: transparent;
    font-size: 0.78rem;
    cursor: pointer;
  }

  > p {
    margin-top: 0.35rem;
    font-size: 0.72rem;
    text-align: right;
  }
`

export const Total = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  font-family: var(--font-display);

  span {
    font-size: 1.1rem;
  }

  strong {
    color: var(--navy);
    font-size: 1.6rem;
  }
`

export const EmptyState = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;

  h3 {
    margin-top: 1.35rem;
    font-size: 1.45rem;
  }

  p {
    max-width: 19rem;
    margin-top: 0.65rem;
  }

  a {
    margin-top: 1.5rem;
    padding: 0.8rem 1.25rem;
    border-radius: 999px;
    color: white;
    background: var(--copper);
    font-weight: 600;
  }
`

export const EmptyIcon = styled.div`
  width: 5.5rem;
  height: 5.5rem;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  color: var(--navy);
  background: var(--porcelain);
  box-shadow: 0 0 0 0.75rem rgba(244, 246, 243, 0.65);

  svg {
    width: 2.25rem;
    height: 2.25rem;
  }
`
