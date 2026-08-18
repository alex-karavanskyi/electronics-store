'use client'
import { useEffect, useState } from 'react'

import Link from 'next/link'

import { GoPerson } from 'react-icons/go'
import { SlBasket } from 'react-icons/sl'
import styled from 'styled-components'

import { openCart } from '@/redux/features/cartSlice'
import { closeModal, toggleModal } from '@/redux/features/modalSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { device } from '@/shared/constants/device'
import NavbarLinks from '@/shared/ui/NavbarLinks'

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false)
  const dispatch = useAppDispatch()
  const isModalOpen = useAppSelector(state => state.modal.isOpen)
  const cartCount = useAppSelector(state =>
    state.cart.items.reduce((total, item) => total + item.quantity, 0)
  )

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 36)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const onResize = () => window.innerWidth >= 768 && dispatch(closeModal())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [dispatch])

  return (
    <Container $scrolled={scrolled}>
      <div className="navbar">
        <Link href="/" className="navbar__brand" aria-label="VOLT home">
          <span>VOLT</span>
          <small>Technology store</small>
        </Link>

        <button
          className="navbar__menu"
          onClick={() => dispatch(toggleModal())}
          aria-label={isModalOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isModalOpen}
        >
          <span />
          <span />
        </button>

        <div className="navbar__right">
          <NavbarLinks parentClass="navbar__links" />
          <div className="navbar__icons">
            <button aria-label="Your account">
              <GoPerson />
            </button>
            <button
              className="navbar__cart"
              onClick={() => dispatch(openCart())}
              aria-label={'Open cart, ' + cartCount + ' items'}
            >
              <SlBasket />
              {cartCount > 0 && (
                <span className="navbar__cart-count" aria-hidden="true">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </Container>
  )
}

const Container = styled.nav<{ $scrolled: boolean }>`
  position: fixed;
  inset: 0 0 auto;
  z-index: 3000;
  height: var(--navbar-height);
  padding: 0 1rem;
  background: ${({ $scrolled }) =>
    $scrolled ? 'rgba(244, 246, 243, 0.94)' : 'var(--navy)'};
  border-bottom: 1px solid
    ${({ $scrolled }) => ($scrolled ? 'var(--line)' : 'rgba(255,255,255,.1)')};
  box-shadow: ${({ $scrolled }) =>
    $scrolled ? '0 12px 35px rgba(16,42,53,.08)' : 'none'};
  backdrop-filter: blur(16px);
  transition:
    background 0.3s ease,
    box-shadow 0.3s ease;

  .navbar {
    width: 100%;
    max-width: 1280px;
    height: 100%;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .navbar__brand {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    color: ${({ $scrolled }) => ($scrolled ? 'var(--navy)' : 'white')};
  }

  .navbar__brand span {
    font-family: var(--font-display);
    font-size: 1.75rem;
    letter-spacing: 0.13em;
  }

  .navbar__brand small {
    display: none;
    padding-left: 0.75rem;
    border-left: 1px solid
      ${({ $scrolled }) =>
        $scrolled ? 'var(--line)' : 'rgba(255,255,255,.25)'};
    color: ${({ $scrolled }) =>
      $scrolled ? 'var(--ink-soft)' : 'rgba(255,255,255,.55)'};
    font-family: var(--font-utility);
    font-size: 0.62rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .navbar__right {
    display: none;
    align-items: center;
    gap: 2.25rem;
  }
  .navbar__links {
    display: flex;
    gap: 1.75rem;
  }
  .navbar__links a {
    color: ${({ $scrolled }) =>
      $scrolled ? 'var(--navy)' : 'rgba(255,255,255,.72)'};
  }
  .navbar__icons {
    display: flex;
    gap: 0.45rem;
    padding-left: 1.5rem;
    border-left: 1px solid
      ${({ $scrolled }) =>
        $scrolled ? 'var(--line)' : 'rgba(255,255,255,.18)'};
  }
  .navbar__icons button {
    position: relative;
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: ${({ $scrolled }) => ($scrolled ? 'var(--navy)' : 'white')};
    cursor: pointer;
    transition: background 0.2s ease;
  }
  .navbar__icons button:hover {
    background: ${({ $scrolled }) =>
      $scrolled ? 'white' : 'rgba(255,255,255,.1)'};
  }
  .navbar__icons svg {
    width: 1.25rem;
    height: 1.25rem;
  }
  .navbar__cart-count {
    position: absolute;
    top: -0.1rem;
    right: -0.15rem;
    min-width: 1.15rem;
    height: 1.15rem;
    display: grid;
    place-items: center;
    padding: 0 0.22rem;
    border: 2px solid ({$scrolled}) =>
      ($scrolled ? 'var(--porcelain)': 'var(--navy)');
    border-radius: 999px;
    color: white;
    background: var(--copper);
    font-size: 0.58rem;
    font-weight: 700;
    line-height: 1;
  }

  .navbar__menu {
    width: 2.75rem;
    height: 2.75rem;
    display: grid;
    align-content: center;
    gap: 6px;
    padding: 0 0.65rem;
    border: 1px solid
      ${({ $scrolled }) => ($scrolled ? 'var(--line)' : 'rgba(255,255,255,.3)')};
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
  }
  .navbar__menu span {
    height: 1px;
    background: ${({ $scrolled }) => ($scrolled ? 'var(--navy)' : 'white')};
    transition: transform 0.25s ease;
  }
  .navbar__menu[aria-expanded='true'] span:first-child {
    transform: translateY(3.5px) rotate(45deg);
  }
  .navbar__menu[aria-expanded='true'] span:last-child {
    transform: translateY(-3.5px) rotate(-45deg);
  }

  @media ${device.mobile} {
    padding: 0 1.5rem;
    .navbar__brand small {
      display: inline;
    }
  }

  @media ${device.tablet} {
    .navbar__menu {
      display: none;
    }
    .navbar__right {
      display: flex;
    }
  }
`

export default Navbar
