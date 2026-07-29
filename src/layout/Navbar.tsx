'use client'
import { useEffect, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { GoPerson } from 'react-icons/go'
import { SlBasket } from 'react-icons/sl'
import styled from 'styled-components'

import pngwing_grey from '@/images/pngwing_grey.png'
import pngwing_red from '@/images/pngwing_red.png'
import { closeModal, toggleModal } from '@/redux/features/modalSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { device } from '@/shared/constants/device'
import NavbarLinks from '@/shared/ui/NavbarLinks'

const Navbar = () => {
  const [navbar, setNavbar] = useState(false)
  const dispatch = useAppDispatch()

  const isModalOpen = useAppSelector(state => state.modal.isOpen)

  useEffect(() => {
    const handleScroll = () => setNavbar(window.scrollY > 80)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) {
        dispatch(closeModal())
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [dispatch])

  const navClassName = navbar ? 'navbar navbar--scrolled' : 'navbar'
  const linksClassName = navbar
    ? 'navbar__links navbar__links--color'
    : 'navbar__links'

  return (
    <>
      <Container>
        <div className={navClassName}>
          <Link href="/">
            <Image
              alt="Logo"
              width={60}
              height={60}
              priority
              src={navbar ? pngwing_red : pngwing_grey}
            />
          </Link>
          <button
            className="navbar__btn"
            onClick={() => dispatch(toggleModal())}
            aria-label={isModalOpen ? 'Close menu' : 'Open menu'}
          >
            <HamburgerIcon />
          </button>
          <div className="navbar__right">
            <NavbarLinks parentClass={linksClassName} />
            <GoPerson
              size={35}
              className={
                navbar
                  ? 'navbar__basket navbar__basket--dark'
                  : 'navbar__basket'
              }
            />
            <SlBasket
              size={35}
              className={
                navbar
                  ? 'navbar__basket navbar__basket--dark'
                  : 'navbar__basket'
              }
            />
          </div>
        </div>
      </Container>
      {navbar && <div style={{ height: '5rem' }} />}
    </>
  )
}

const HamburgerIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M4 8H24" className="line line-1" />
    <path d="M4 14H24" className="line line-2" />
    <path d="M4 20H24" className="line line-3" />
  </svg>
)

const Container = styled.nav`
  .navbar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: var(--navbar-height);
    z-index: 3000;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--gradient-navbar-footer-bg);
    padding: 0 1rem;
    transition:
      background 0.3s ease,
      box-shadow 0.3s ease;
  }

  .navbar--scrolled {
    background: var(--clr-primary-3);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }

  .navbar__btn {
    position: absolute;
    right: 1rem;
    background: transparent;
    border: none;
    cursor: pointer;
    color: #84436c;
  }

  .navbar__btn:hover .line {
    stroke-width: 4;
  }

  .navbar__btn:hover .line-1 {
    transform: translateY(-2px) scaleX(1.1);
  }

  .navbar__btn:hover .line-2 {
    transform: scaleX(1.2);
  }

  .navbar__btn:hover .line-3 {
    transform: translateY(2px) scaleX(1.1);
  }

  .navbar__links {
    display: none;
  }

  .navbar__btn[aria-label='Close menu'] .line-1 {
    transform: translateY(6px) rotate(45deg);
  }

  .navbar__btn[aria-label='Close menu'] .line-2 {
    opacity: 0;
    transform: scaleX(0);
  }

  .navbar__btn[aria-label='Close menu'] .line-3 {
    transform: translateY(-6px) rotate(-45deg);
  }

  .line {
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    transform-origin: center;
    transition:
      opacity 0.3s ease,
      stroke-width 0.3s ease,
      transform 0.3s ease;
  }

  .navbar__basket {
    font-size: 1.7rem;
    color: var(--clr-primary-4);
    cursor: pointer;
    transition:
      color 0.3s ease,
      transform 0.25s ease,
      filter 0.25s ease;
  }

  .navbar__basket--dark {
    color: black;
  }

  .navbar__basket:hover {
    animation: basketShake 0.35s ease;
  }

  .navbar__basket {
    display: none;
  }

  @keyframes basketShake {
    0% {
      transform: rotate(0deg);
    }
    25% {
      transform: rotate(-10deg);
    }
    50% {
      transform: rotate(8deg);
    }
    75% {
      transform: rotate(-4deg);
    }
    100% {
      transform: rotate(0deg);
    }
  }

  .navbar__basket:active {
    transform: scale(0.95);
  }

  .navbar__right {
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  @media ${device.mobile} {
    .navbar__btn {
      display: none;
    }

    .navbar__basket {
      display: block;
    }

    .navbar__links {
      display: flex;
      justify-content: end;
      gap: 2rem;
    }
  }
`

export default Navbar
