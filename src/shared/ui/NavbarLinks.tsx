'use client'
import Link from 'next/link'

import { motion } from 'framer-motion'
import styled from 'styled-components'

import { closeModal } from '@/redux/features/modalSlice'
import { useAppDispatch } from '@/redux/hooks'

const links = [
  { href: '/contact', label: 'contact' },
  { href: '/favorites', label: 'favorites' },
]

const NavbarLinks: React.FC<{ parentClass?: string }> = ({ parentClass }) => {
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
    <Container>
      <motion.ul
        className={parentClass}
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
            <Link href={link.href}>{link.label}</Link>
          </motion.li>
        ))}
      </motion.ul>
    </Container>
  )
}

const Container = styled.nav`
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    gap: 2rem;
  }

  li {
    position: relative;
    cursor: pointer;
    transition: color 0.3s ease;
  }

  a {
    position: relative;
    display: inline-block;
    text-decoration: none;
    font-family: var(--font-main);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    color: rgba(255, 255, 255, 0.72);
    transition: color 0.3s ease;
  }

  a::after {
    content: '';
    position: absolute;
    bottom: -4px;
    left: 0;
    width: 0;
    height: 2px;
    background-color: var(--copper);
    transition: width 0.3s ease;
  }

  li:hover a::after {
    width: 100%;
  }

  .navbar__links--color a {
    color: var(--ink);
  }

  .sidebar__links {
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  .sidebar__links a {
    font-size: 2rem;
  }
`

export default NavbarLinks
