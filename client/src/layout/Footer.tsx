import { useRef } from 'react'

import { motion, useInView } from 'framer-motion'

import SocialLinks from '@/shared/ui/SocialLinks'

import {
  companyInformation,
  help,
  services,
  customerAccount,
} from '../shared/constants/footerData'

import FooterColumn from './FooterColumn'
import styles from './Footer.module.scss'

const sections = [
  { title: 'Company Information', items: companyInformation },
  { title: 'Help', items: help },
  { title: 'Services', items: services },
  { title: 'Customer Account', items: customerAccount },
]

const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const Footer = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  return (
    <footer className={styles.container}>
      <div className={styles.footer__container} ref={ref}>
        <div className={styles.footer__intro}>
          <div className={styles.footer__wordmark}>VOLT</div>
          <h2>
            Upgrade your
            <br />
            <em>everyday.</em>
          </h2>
          <p>
            Useful technology, selected for people who care about quality,
            performance and thoughtful design.
          </p>
        </div>
        <motion.nav
          className={styles.footer__grid}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          variants={gridVariants}
        >
          {sections.map((section, index) => (
            <FooterColumn
              key={section.title}
              title={section.title}
              items={section.items}
              index={index}
              isInView={isInView}
            />
          ))}
        </motion.nav>
      </div>
      <SocialLinks />
    </footer>
  )
}

export default Footer
