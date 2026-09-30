import { useEffect, useState } from 'react'

import { Link } from 'react-router-dom'

import { GoPerson } from 'react-icons/go'
import { SlBasket } from 'react-icons/sl'

import { openCart, selectCartQuantity } from '@/redux/features/cartSlice'
import { closeNavigation, toggleNavigation } from '@/redux/features/navigationSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import NavbarLinks from '@/shared/ui/NavbarLinks'

import styles from './Navbar.module.scss'

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false)
  const dispatch = useAppDispatch()
  const isNavigationOpen = useAppSelector(state => state.navigation.isOpen)
  const cartCount = useAppSelector(selectCartQuantity)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 36)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const onResize = () => window.innerWidth >= 768 && dispatch(closeNavigation())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [dispatch])

  return (
    <nav
      className={[styles.container, scrolled ? styles.scrolled : '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.navbar}>
        <Link to="/" className={styles.navbar__brand} aria-label="VOLT home">
          <span>VOLT</span>
          <small>Technology store</small>
        </Link>

        <button
          className={styles.navbar__menu}
          onClick={() => dispatch(toggleNavigation())}
          aria-label={isNavigationOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isNavigationOpen}
        >
          <span />
          <span />
        </button>

        <div className={styles.navbar__right}>
          <NavbarLinks parentClass={styles.navbar__links} />
          <div className={styles.navbar__icons}>
            <button aria-label="Your account">
              <GoPerson />
            </button>
            <button
              className={'navbar__cart'}
              onClick={() => dispatch(openCart())}
              aria-label={'Open cart, ' + cartCount + ' items'}
            >
              <SlBasket />
              {cartCount > 0 && (
                <span
                  className={styles['navbar__cart-count']}
                  aria-hidden="true"
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
