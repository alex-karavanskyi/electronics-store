import { NavLink } from 'react-router-dom'

import { motion } from 'framer-motion'

import { closeModal } from '@/redux/features/modalSlice'
import { useAppDispatch } from '@/redux/hooks'

import styles from './NavbarLinks.module.scss'

const links = [
  { href: '/contact', label: 'contact' },
  { href: '/favorites', label: 'favorites' },
]

const NavbarLinks: React.FC<{
  parentClass?: string
  variant?: 'default' | 'sidebar' | 'dark'
}> = ({ parentClass, variant = 'default' }) => {
  const dispatch = useAppDispatch()

  const listVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  }

  return (
    <nav className={styles.container}>
      <motion.ul
        className={[parentClass, variant === 'default' ? '' : styles[variant]]
          .filter(Boolean)
          .join(' ')}
        variants={listVariants}
        initial="hidden"
        animate="visible"
      >
        {links.map(link => (
          <motion.li
            key={link.href}
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            onClick={() => dispatch(closeModal())}
          >
            <NavLink to={link.href}>{link.label}</NavLink>
          </motion.li>
        ))}
      </motion.ul>
    </nav>
  )
}

export default NavbarLinks
