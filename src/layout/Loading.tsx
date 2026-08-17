'use client'

import styled, { keyframes } from 'styled-components'

const devicePulse = keyframes`
  0%, 18%, 100% {
    color: var(--navy);
    opacity: 0.35;
    transform: translateY(0) scale(0.94);
  }

  28%, 43% {
    color: var(--copper);
    opacity: 1;
    transform: translateY(-4px) scale(1);
  }
`

const dataFlow = keyframes`
  0% {
    opacity: 0;
    transform: translateX(0) scale(0.6);
  }

  12%, 88% {
    opacity: 1;
  }

  50% {
    transform: translateX(4.7rem) scale(1);
  }

  100% {
    opacity: 0;
    transform: translateX(9.4rem) scale(0.6);
  }
`

const Loading = () => {
  return (
    <Container role={'status'} aria-live={'polite'}>
      <Loader aria-hidden={true}>
        <div className={'tech__devices'}>
          <span className={'tech__device tech__device--watch'}>
            <i className={'tech__watch'} />
          </span>
          <span className={'tech__device tech__device--laptop'}>
            <i className={'tech__laptop'} />
          </span>
          <span className={'tech__device tech__device--headphones'}>
            <i className={'tech__headphones'} />
          </span>
        </div>
        <span className={'tech__track'}>
          <span className={'tech__signal'} />
        </span>
      </Loader>
      <span className={'sr-only'}>Loading</span>
    </Container>
  )
}

const Container = styled.div`
  display: grid;
  min-height: calc(100svh - var(--navbar-height));
  place-items: center;
  padding: 2rem;

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
`

const Loader = styled.div`
  display: grid;
  width: min(13.5rem, 100%);
  gap: 0.85rem;

  .tech__devices {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .tech__device {
    display: grid;
    height: 3.5rem;
    color: var(--navy);
    opacity: 0.35;
    place-items: center;
    animation: ${devicePulse} 1.7s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  .tech__device--laptop {
    animation-delay: 0.38s;
  }

  .tech__device--headphones {
    animation-delay: 0.76s;
  }

  .tech__watch {
    position: relative;
    width: 1.45rem;
    height: 1.75rem;
    border: 2px solid currentcolor;
    border-radius: 0.45rem;
    background: radial-gradient(
      circle,
      currentcolor 0 0.12rem,
      transparent 0.14rem
    );

    &::before,
    &::after {
      position: absolute;
      left: 50%;
      width: 0.75rem;
      height: 0.48rem;
      border-right: 2px solid currentcolor;
      border-left: 2px solid currentcolor;
      content: '';
      transform: translateX(-50%);
    }

    &::before {
      bottom: 100%;
    }

    &::after {
      top: 100%;
    }
  }

  .tech__laptop {
    position: relative;
    width: 2.5rem;
    height: 1.6rem;
    border: 2px solid currentcolor;
    border-radius: 0.22rem;

    &::after {
      position: absolute;
      top: calc(100% + 0.18rem);
      left: 50%;
      width: 2.95rem;
      height: 0.18rem;
      border-radius: 0 0 0.25rem 0.25rem;
      background: currentcolor;
      content: '';
      transform: translateX(-50%);
    }
  }

  .tech__headphones {
    position: relative;
    width: 2.25rem;
    height: 1.9rem;
    border: 2px solid currentcolor;
    border-bottom: 0;
    border-radius: 1.25rem 1.25rem 0 0;

    &::before,
    &::after {
      position: absolute;
      top: 0.85rem;
      width: 0.42rem;
      height: 0.85rem;
      border-radius: 0.18rem;
      background: currentcolor;
      content: '';
    }

    &::before {
      left: -0.25rem;
    }

    &::after {
      right: -0.25rem;
    }
  }

  .tech__track {
    position: relative;
    justify-self: center;
    width: 10rem;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgb(16 42 53 / 0.18) 12%,
      rgb(16 42 53 / 0.18) 88%,
      transparent
    );
  }

  .tech__signal {
    position: absolute;
    top: 50%;
    left: 0;
    width: 0.6rem;
    height: 0.6rem;
    border: 2px solid var(--porcelain);
    border-radius: 50%;
    background: var(--copper);
    box-shadow: 0 0 0 4px rgb(200 120 69 / 0.14);
    animation: ${dataFlow} 1.7s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .tech__device {
      opacity: 1;
      animation: none;
    }

    .tech__signal {
      display: none;
    }
  }
`

export default Loading
