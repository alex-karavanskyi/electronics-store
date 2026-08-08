import { keyframes, css } from 'styled-components'

export const pulseAnimation = keyframes`
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
  100% {
    opacity: 1;
  }
`

export const shimmerAnimation = keyframes`
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
`

export const containerStyles = css`
  width: 100%;
  margin: 0 auto;
  max-width: 1280px;
`

export const containerCart = css`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

export const skeletonBaseStyles = css`
  border-radius: 4px;
  background: var(--clr-grey-3);
  animation: ${pulseAnimation} 1.5s infinite ease-in-out;
`

export const skeletonShimmerStyles = css`
  background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
  background-size: 200% 100%;
  animation: ${shimmerAnimation} 1.2s infinite;
`
