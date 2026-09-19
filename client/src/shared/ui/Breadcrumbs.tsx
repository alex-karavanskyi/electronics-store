import { Link } from 'react-router-dom'
import styles from './Breadcrumbs.module.scss'
interface BreadcrumbsProps {
  name: string
}
const Breadcrumbs = ({ name }: BreadcrumbsProps) => (
  <div className={styles.container}>
    <Link to="/" className={styles.breadcrumbs__link}>
      Home
    </Link>
    <span className={styles.breadcrumbs__separator}>›</span>
    <span className={styles.breadcrumbs__current}>{name}</span>
  </div>
)
export default Breadcrumbs
