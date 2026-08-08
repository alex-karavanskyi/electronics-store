'use client'
import { useState } from 'react'

import styled, { keyframes } from 'styled-components'

import { HandleClearButtonFn } from '@/shared/types/productsType'

interface ClearButtonProps {
  handleClearButton: HandleClearButtonFn
}

const ClearButton: React.FC<ClearButtonProps> = ({ handleClearButton }) => {
  const [clicked, setClicked] = useState(false)

  const handleClick = () => {
    setClicked(true)
    handleClearButton()
    setTimeout(() => setClicked(false), 300)
  }

  return (
    <Container>
      <button
        type="button"
        className={`clear__btn ${clicked ? 'animate' : ''}`}
        onClick={handleClick}
      >
        clear filters
      </button>
    </Container>
  )
}

const pop = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
`

const Container = styled.div`
  .clear__btn {
    width: 100%;
    padding: 0.75rem 0.9rem;
    text-transform: capitalize;
    background: var(--navy);
    border: 1px solid var(--navy);
    border-radius: 77px;
    letter-spacing: var(--spacing);
    color: white;
    font-family: var(--font-main);
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .clear__btn:hover {
    transform: translateY(-1px);
  }

  .clear__btn.animate {
    animation: ${pop} 0.3s ease;
  }
`

export default ClearButton
