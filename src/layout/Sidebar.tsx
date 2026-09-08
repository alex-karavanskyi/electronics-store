'use client'
import { GoPerson } from 'react-icons/go'
import { SlBasket } from 'react-icons/sl'

import { openCart } from '@/redux/features/cartSlice'
import { closeModal } from '@/redux/features/modalSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { NavbarLinks, SocialLinks } from '@/shared/ui'

import styles from './Sidebar.module.scss'

const Sidebar = () => {
  const { isOpen } = useAppSelector(store => store.modal)
  const cartCount = useAppSelector(state =>
    state.cart.items.reduce((total, item) => total + item.quantity, 0)
  )
  const dispatch = useAppDispatch()

  return (
    <div className={styles.container}>
      <aside
        className={[styles.sidebar, isOpen ? styles['sidebar--show'] : '']
          .filter(Boolean)
          .join(' ')}
      >
        <div className={styles.sidebar__overlay} />
        <div className={styles.sidebar__content}>
          <div className={styles.sidebar__nav}>
            <div className={styles.sidebar__icons}>
              <GoPerson className={styles.sidebar__basket} />
              <button
                type="button"
                className={styles.sidebar__cart}
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
            <NavbarLinks
              variant="sidebar"
              parentClass={styles.sidebar__links}
            />
          </div>
          <SocialLinks />
        </div>
      </aside>
    </div>
  )
}

export default Sidebar
