import { useRouter } from 'next/navigation'

import styles from './Breadcrumbs.module.scss'

interface BreadcrumbsProps {
  name: string
}

const Breadcrumbs = ({ name }: BreadcrumbsProps) => {
  const router = useRouter()
  return (
    <div className={styles.container}>
      <span
        onClick={() => router.push('/')}
        className={styles.breadcrumbs__link}
      >
        Home
      </span>
      <span className={styles.breadcrumbs__separator}>›</span>
      <span className={styles.breadcrumbs__current}>{name}</span>
    </div>
  )
}

export default Breadcrumbs
