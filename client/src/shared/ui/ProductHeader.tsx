import type { ReactNode } from 'react'

import styles from './ProductHeader.module.scss'

type ProductHeaderProps = {
  name: string
  variant?: 'compact' | 'detailed'
  children?: ReactNode
}

const ProductHeader = ({
  name,
  variant = 'compact',
  children,
}: ProductHeaderProps) => {
  const detailedClass = variant === 'detailed' ? styles.detailed : ''

  return (
    <div className={[styles.header, detailedClass].filter(Boolean).join(' ')}>
      <h5 className={[styles.name, detailedClass].filter(Boolean).join(' ')}>
        {name}
      </h5>
      {children}
    </div>
  )
}

export default ProductHeader
