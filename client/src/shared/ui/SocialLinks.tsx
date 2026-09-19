import { FaGithub, FaLinkedin, FaTelegram } from 'react-icons/fa'

import { socialLinks } from '@/shared/constants/socialLinksData'

import styles from './SocialLinks.module.scss'

const SocialLinks = () => (
  <ul className={styles.container}>
    <SocialLink
      label="GitHub"
      href={socialLinks.github}
      icon={<FaGithub aria-hidden="true" />}
    />
    <SocialLink
      label="LinkedIn"
      href={socialLinks.linkedin}
      icon={<FaLinkedin aria-hidden="true" />}
    />
    <SocialLink
      label="Telegram"
      href={socialLinks.telegram}
      icon={<FaTelegram aria-hidden="true" />}
    />
  </ul>
)

interface SocialLinkProps {
  label: string
  href: string
  icon: React.ReactNode
}

const SocialLink = ({ href, icon, label }: SocialLinkProps) => (
  <li>
    <a aria-label={label} href={href} className={styles['social__links-icon']}>
      {icon}
    </a>
  </li>
)

export default SocialLinks
