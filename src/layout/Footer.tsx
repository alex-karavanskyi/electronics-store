'use client'
import { useRef } from 'react'

import Link from 'next/link'

import { motion, useInView } from 'framer-motion'

import SocialLinks from '@/shared/ui/SocialLinks'

import {
  companyInformation,
  help,
  services,
  customerAccount,
} from '../shared/constants/footerData'

import styles from './Footer.module.scss'

const Footer = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.2 })

  const sections = [
    { title: 'Company Information', items: companyInformation },
    { title: 'Help', items: help },
    { title: 'Services', items: services },
    { title: 'Customer Account', items: customerAccount },
  ]

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
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.08, delayChildren: 0.1 },
            },
          }}
        >
          {sections.map((section, index) => (
            <motion.div
              className={styles.footer__column}
              key={section.title}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <motion.h3
                className={styles.footer__title}
                initial="hidden"
                animate={isInView ? 'visible' : 'hidden'}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{
                  duration: 0.35,
                  delay: 0.12 + index * 0.04,
                }}
              >
                {section.title}
              </motion.h3>
              <ul className={styles.footer__list}>
                {section.items.map((item, index) => (
                  <motion.li
                    key={item.id}
                    initial="hidden"
                    animate={isInView ? 'visible' : 'hidden'}
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: { opacity: 1, y: 0 },
                    }}
                    transition={{
                      duration: 0.3,
                      delay: 0.16 + index * 0.03,
                    }}
                  >
                    <Link href="/" className={styles.footer__link}>
                      {item.title}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.nav>
      </div>
      <SocialLinks />
    </footer>
  )
}

export default Footer
