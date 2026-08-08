'use client'
import { useRef } from 'react'

import Link from 'next/link'

import { motion, useInView } from 'framer-motion'
import styled from 'styled-components'

import { device } from '@/shared/constants/device'
import SocialLinks from '@/shared/ui/SocialLinks'
import { containerStyles } from '@/shared/ui/styles/containerStyles'

import {
  companyInformation,
  help,
  services,
  customerAccount,
} from '../shared/constants/footerData'

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
    <Container>
      <div className="footer__container" ref={ref}>
        <div className="footer__intro">
          <div className="footer__wordmark">VOLT</div>
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
          className="footer__grid"
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
              className="footer__column"
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
                className="footer__title"
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
              <ul className="footer__list">
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
                    <Link href="/" className="footer__link">
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
    </Container>
  )
}

const Container = styled.footer`
  margin-top: 2rem;
  padding: 4.5rem 1rem 1.5rem;
  background: var(--navy);
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  .footer__container {
    ${containerStyles}
  }

  .footer__intro {
    display: grid;
    gap: 1.25rem;
    padding-bottom: 4rem;
    margin-bottom: 3rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  }

  .footer__wordmark {
    color: var(--copper);
    font-family: var(--font-display);
    font-size: 1.25rem;
    letter-spacing: 0.14em;
  }

  .footer__intro h2 {
    color: white;
    font-size: clamp(2.8rem, 7vw, 5.5rem);
  }

  .footer__intro em {
    color: var(--copper);
    font-weight: 400;
  }
  .footer__intro p {
    max-width: 30rem;
    color: rgba(255, 255, 255, 0.55);
  }

  .footer__grid {
    display: grid;
    gap: 2.5rem;
    grid-template-columns: repeat(auto-fit, minmax(120px, 250px));
    justify-content: space-between;
  }

  .footer__column {
    font-size: 0.95rem;
  }

  .footer__title {
    color: white;
    font-weight: 600;
    font-family: var(--font-main);
    font-size: 1rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    text-transform: capitalize;
    margin-bottom: 1.5rem;
  }

  .footer__list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
  }

  .footer__link {
    color: rgba(255, 255, 255, 0.5);
    text-decoration: none;
    transition: color 0.3s ease;
  }

  .footer__link:hover {
    color: var(--copper);
  }

  @media ${device.mobile} {
    padding-right: 1.5rem;
    padding-left: 1.5rem;
    .footer__intro {
      grid-template-columns: 0.35fr 1fr 0.7fr;
      align-items: end;
    }
    .footer__grid {
      justify-content: center;
    }
  }
`

export default Footer
