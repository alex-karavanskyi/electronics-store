import { useRouter } from 'next/navigation'

import styled from 'styled-components'

import { device } from '../constants/device'

interface BreadcrumbsProps {
  name: string
}

const Breadcrumbs = ({ name }: BreadcrumbsProps) => {
  const router = useRouter()
  return (
    <Container>
      <span onClick={() => router.push('/')} className="breadcrumbs__link">
        Home
      </span>
      <span className="breadcrumbs__separator">›</span>
      <span className="breadcrumbs__current">{name}</span>
    </Container>
  )
}

const Container = styled.div`
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  color: var(--ink-soft);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;

  .breadcrumbs__link {
    color: var(--ink-soft);
    cursor: pointer;
    transition: color 0.3s ease;
  }

  .breadcrumbs__link:hover {
    color: var(--copper-dark);
  }

  .breadcrumbs__separator {
    color: var(--copper);
  }

  .breadcrumbs__current {
    color: var(--ink);
    font-weight: 500;
    text-transform: capitalize;
  }

  @media ${device.desktop} {
    padding-left: 0;
  }
`

export default Breadcrumbs
