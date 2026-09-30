import { Link } from 'react-router-dom'

import { motion } from 'framer-motion'

import styles from './Footer.module.scss'

type FooterItem = {
  id: number
  title: string
}

type FooterColumnProps = {
  title: string
  items: readonly FooterItem[]
  index: number
  isInView: boolean
}

const columnVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const titleVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
}

const FooterColumn = ({ title, items, index, isInView }: FooterColumnProps) => (
  <motion.div
    className={styles.footer__column}
    initial="hidden"
    animate={isInView ? 'visible' : 'hidden'}
    variants={columnVariants}
    transition={{ duration: 0.4, delay: index * 0.05 }}
  >
    <motion.h3
      className={styles.footer__title}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={titleVariants}
      transition={{ duration: 0.35, delay: 0.12 + index * 0.04 }}
    >
      {title}
    </motion.h3>
    <ul className={styles.footer__list}>
      {items.map((item, itemIndex) => (
        <motion.li
          key={item.id}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={itemVariants}
          transition={{ duration: 0.3, delay: 0.16 + itemIndex * 0.03 }}
        >
          <Link to="/" className={styles.footer__link}>
            {item.title}
          </Link>
        </motion.li>
      ))}
    </ul>
  </motion.div>
)

export default FooterColumn
