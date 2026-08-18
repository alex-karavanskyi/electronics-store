'use client'
import { GoPerson } from 'react-icons/go'
import { SlBasket } from 'react-icons/sl'
import styled from 'styled-components'

import { openCart } from '@/redux/features/cartSlice'
import { closeModal } from '@/redux/features/modalSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { device } from '@/shared/constants/device'
import { NavbarLinks, SocialLinks } from '@/shared/ui'

const Sidebar = () => {
  const { isOpen } = useAppSelector(store => store.modal)
  const cartCount = useAppSelector(state =>
    state.cart.items.reduce((total, item) => total + item.quantity, 0)
  )
  const dispatch = useAppDispatch()

  return (
    <Container>
      <aside className={`sidebar ${isOpen ? 'sidebar--show' : ''}`}>
        <div className="sidebar__overlay" />
        <div className="sidebar__content">
          <div className="sidebar__nav">
            <div className="sidebar__icons">
              <GoPerson className="sidebar__basket" />
              <button
                type="button"
                className="sidebar__cart"
                aria-label={'Open cart, ' + cartCount + ' items'}
                onClick={() => {
                  dispatch(closeModal())
                  dispatch(openCart())
                }}
              >
                <SlBasket />
                {cartCount > 0 && (
                  <span aria-hidden="true">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </button>
            </div>
            <NavbarLinks parentClass="sidebar__links" />
          </div>
          <SocialLinks />
        </div>
      </aside>
    </Container>
  )
}

const Container = styled.div`
  .sidebar {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
    transform: translateX(-100%);
    opacity: 0;
    background: var(--navy);
    transition:
      transform 0.3s ease-in-out,
      opacity 0.3s ease-in-out;
    will-change: transform, opacity;
    pointer-events: none;
  }

  .sidebar--show {
    transform: translateX(0);
    opacity: 1;
    pointer-events: auto;
  }

  @keyframes gradientShift {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }

  .sidebar__overlay {
    position: absolute;
    inset: 0;
    background: rgb(0 0 0 / 0.7);
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
    will-change: opacity;
  }

  .sidebar--show .sidebar__overlay {
    opacity: 1;
  }

  .sidebar__content {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
  }

  .sidebar__nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .sidebar__icons {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .sidebar__links {
    text-align: center;
    opacity: 0;
    transform: translateY(20px);
    transition:
      opacity 0.3s ease-in-out,
      transform 0.3s ease-in-out;
  }

  .sidebar--show .sidebar__links {
    opacity: 1;
    transform: translateY(0);
  }

  .sidebar__basket {
    font-size: 2.5rem;
    color: var(--clr-primary-4);
    cursor: pointer;
    transition:
      color 0.3s ease,
      transform 0.25s ease,
      filter 0.25s ease;
  }

  .sidebar__cart {
    position: relative;
    display: grid;
    place-items: center;
    border: 0;
    color: var(--clr-primary-4);
    background: transparent;
    cursor: pointer;
  }

  .sidebar__cart svg {
    width: 2.5rem;
    height: 2.5rem;
  }

  .sidebar__cart span {
    position: absolute;
    top: -0.5rem;
    right: -0.65rem;
    min-width: 1.35rem;
    height: 1.35rem;
    display: grid;
    place-items: center;
    padding: 0 0.25rem;
    border-radius: 999px;
    color: white;
    background: var(--copper);
    font-size: 0.65rem;
    font-weight: 700;
  }

  @media ${device.mobile} {
    .sidebar__links {
      gap: 2rem;
    }
  }
`

export default Sidebar
