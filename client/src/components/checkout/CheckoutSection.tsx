import type { ReactNode } from 'react'
import { HiChevronDown } from 'react-icons/hi2'
import styles from './CheckoutFields.module.scss'

export default function CheckoutSection({
  title,
  number,
  children,
  initiallyOpen = false,
}: {
  title: string
  number: string
  children: ReactNode
  initiallyOpen?: boolean
}) {
  return (
    <details className={styles.section} open={initiallyOpen || undefined}>
      <summary>
        <span className={styles.step}>{number}</span>
        {title}
        <HiChevronDown />
      </summary>
      <div className={styles.fields}>{children}</div>
    </details>
  )
}

