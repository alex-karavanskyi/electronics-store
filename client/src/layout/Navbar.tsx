import { useEffect, useState } from 'react'

import { Link, NavLink } from 'react-router-dom'

import { FiHeart } from 'react-icons/fi'
import { SlBasket } from 'react-icons/sl'

import { openCart, selectCartQuantity } from '@/redux/features/cartSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import ThemeSwitcher from '@/shared/ui/ThemeSwitcher'
import AccountControls from '@/shared/auth/AccountControls'
import ProductNavigation from './ProductNavigation'

import styles from './Navbar.module.scss'

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false)
  const dispatch = useAppDispatch()
  const cartCount = useAppSelector(selectCartQuantity)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 36)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav
      aria-label="Main navigation"
      className={[styles.container, scrolled ? styles.scrolled : '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className={styles.navbar}>
        <div className={styles.navbar__links}>
          <Link to="/" className={styles.navbar__brand} aria-label="VOLT home">
            <span>VOLT</span>
            <small>Technology store</small>
          </Link>
          <ProductNavigation />
        </div>

        <div className={styles.navbar__icons}>
          <ThemeSwitcher />
          <NavLink to="/favorites" aria-label="Favorites" title="Favorites">
            <FiHeart aria-hidden="true" />
          </NavLink>
          <AccountControls className={styles.navbar__account} />
          <button
            type="button"
            className={'navbar__cart'}
            onClick={() => dispatch(openCart())}
            aria-label={'Open cart, ' + cartCount + ' items'}
          >
            <SlBasket aria-hidden="true" />
            {cartCount > 0 && (
              <span className={styles['navbar__cart-count']} aria-hidden="true">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
