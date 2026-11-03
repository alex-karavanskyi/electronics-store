import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAccess } from '@/shared/auth/useAccess'
import styles from './Navbar.module.scss'

export default function ProductNavigation() {
  const access = useAccess()
  if (access.status !== 'authenticated') return null
  return access.isAdmin ? (
    <AdminNavigation key={access.userId} />
  ) : (
    <NavLink to="/my-products" className={styles.navbar__products}>
      My products
    </NavLink>
  )
}

function AdminNavigation() {
  const details = useRef<HTMLDetailsElement>(null)
  const summary = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  useEffect(() => {
    if (details.current) details.current.open = false
  }, [pathname])
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (details.current && !details.current.contains(event.target as Node))
        details.current.open = false
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])
  return (
    <details
      ref={details}
      className={styles.productMenu}
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          event.currentTarget.open = false
      }}
      onKeyDown={event => {
        if (event.key === 'Escape' && details.current?.open) {
          event.preventDefault()
          details.current.open = false
          summary.current?.focus()
        }
      }}
    >
      <summary ref={summary} className={styles.navbar__products}>
        Products
      </summary>
      <div className={styles.productLinks}>
        <NavLink
          to="/my-products"
          onClick={() => {
            if (details.current) details.current.open = false
          }}
        >
          My products
        </NavLink>
        <NavLink
          to="/admin/products"
          onClick={() => {
            if (details.current) details.current.open = false
          }}
        >
          Admin panel
        </NavLink>
      </div>
    </details>
  )
}
