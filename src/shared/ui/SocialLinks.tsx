'use client'
import { FaGithub, FaLinkedin, FaTelegram } from 'react-icons/fa'

import { socialLinks } from '@/shared/constants/socialLinksData'

import styles from './SocialLinks.module.scss'

const SocialLinks = () => (
  <ul className={styles.container}>
    <SocialLink href={socialLinks.github} icon={<FaGithub />} />
    <SocialLink href={socialLinks.linkedin} icon={<FaLinkedin />} />
    <SocialLink href={socialLinks.telegram} icon={<FaTelegram />} />
  </ul>
)

interface SocialLinkProps {
  href: string
  icon: React.ReactNode
}

const SocialLink = ({ href, icon }: SocialLinkProps) => (
  <li>
    <a href={href} className={styles['social__links-icon']}>
      {icon}
    </a>
  </li>
)

export default SocialLinks
