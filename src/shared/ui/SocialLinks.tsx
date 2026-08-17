'use client'
import { FaGithub, FaLinkedin, FaTelegram } from 'react-icons/fa'
import styled from 'styled-components'

import { socialLinks } from '@/shared/constants/socialLinksData'

const SocialLinks = () => (
  <Container>
    <SocialLink href={socialLinks.github} icon={<FaGithub />} />
    <SocialLink href={socialLinks.linkedin} icon={<FaLinkedin />} />
    <SocialLink href={socialLinks.telegram} icon={<FaTelegram />} />
  </Container>
)

interface SocialLinkProps {
  href: string
  icon: React.ReactNode
}

const SocialLink = ({ href, icon }: SocialLinkProps) => (
  <li>
    <a href={href} className="social__links-icon">
      {icon}
    </a>
  </li>
)

const Container = styled.ul`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-top: 5rem;

  .social__links-icon {
    display: inline-flex;
    font-size: 1.5rem;
    color: var(--social-icon);
    transition:
      color 0.25s ease,
      transform 0.25s ease;
  }

  .social__links-icon:hover {
    color: var(--social-icon-hover);
    transform: translateY(-2px);
  }
`

export default SocialLinks
