import Modal from '@/shared/ui/Modal'
import { GoPerson } from 'react-icons/go'
import { SlBasket } from 'react-icons/sl'

import { openCart, selectCartQuantity } from '@/redux/features/cartSlice'
import { closeNavigation } from '@/redux/features/navigationSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { NavbarLinks, SocialLinks } from '@/shared/ui'

import styles from './Sidebar.module.scss'

const Sidebar = () => {
  const { isOpen } = useAppSelector(store => store.navigation)
  const cartCount = useAppSelector(selectCartQuantity)
  const dispatch = useAppDispatch()

  if (!isOpen) return null

  return (
    <Modal
      className={styles.container}
      label="Navigation menu"
      onClose={() => dispatch(closeNavigation())}
    >
      <aside
        className={[styles.sidebar, isOpen ? styles['sidebar--show'] : '']
          .filter(Boolean)
          .join(' ')}
      >
        <div className={styles.sidebar__overlay} />
        <div className={styles.sidebar__content}>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => dispatch(closeNavigation())}
            aria-label="Close navigation menu"
          >
            Close menu
          </button>
          <div className={styles.sidebar__nav}>
            <div className={styles.sidebar__icons}>
              <GoPerson className={styles.sidebar__basket} />
              <button
                type="button"
                className={styles.sidebar__cart}
                aria-label={'Open cart, ' + cartCount + ' items'}
                onClick={() => {
                  dispatch(closeNavigation())
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
    </Modal>
  )
}

export default Sidebar
