'use client'
import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/pagination'
import { useEffect, useRef, useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import {
  FiArrowDownRight,
  FiArrowUpRight,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi'
import styled, { keyframes } from 'styled-components'
import { Autoplay, EffectFade, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import { useAppSelector } from '@/redux/hooks'
import { Product } from '@/shared/types/productsType'
import { containerStyles } from '@/shared/ui/styles/containerStyles'

const Slider = () => {
  const [slides, setSlides] = useState<Product[]>([])
  const swiperRef = useRef<any>(null)
  const { products, products_loading: loading } = useAppSelector(
    state => state.products
  )

  useEffect(() => {
    if (!loading && products.length > 0) setSlides(products.slice(0, 5))
  }, [loading, products])

  return (
    <Hero>
      <div className="hero__shell">
        <div className="hero__copy">
          <p className="hero__eyebrow">Technology · thoughtfully selected</p>
          <h1>
            Better technology
            <em> for everyday life.</em>
          </h1>
          <p className="hero__intro">
            Reliable devices for work, home and entertainment — selected for
            performance, quality and long-term value.
          </p>
          <Link href="#collection" className="hero__cta">
            Browse the catalogue <FiArrowDownRight />
          </Link>
        </div>

        <div className="hero__visual">
          <Swiper
            ref={swiperRef}
            effect="fade"
            loop={slides.length > 1}
            speed={900}
            autoplay={{ delay: 4500, disableOnInteraction: false }}
            pagination={{ el: '.hero__pagination', clickable: true }}
            modules={[Autoplay, EffectFade, Pagination]}
          >
            {loading || slides.length === 0 ? (
              <SwiperSlide>
                <SkeletonSlide />
              </SwiperSlide>
            ) : (
              slides.map(product => (
                <SwiperSlide key={product.id}>
                  <Image
                    alt={product.name}
                    src={product.image}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 58vw"
                  />
                  <div className="hero__image-shade" />
                  <div className="hero__caption">
                    <span>Featured product</span>
                    <strong>{product.name}</strong>
                  </div>
                </SwiperSlide>
              ))
            )}
          </Swiper>

          <div className="hero__controls">
            <div className="hero__pagination" />
            <div className="hero__arrows">
              <button
                type="button"
                aria-label="Previous product"
                onClick={() => swiperRef.current?.swiper?.slidePrev()}
              >
                <FiChevronLeft />
              </button>
              <button
                type="button"
                aria-label="Next product"
                onClick={() => swiperRef.current?.swiper?.slideNext()}
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>

        <div className="hero__stay-bar" aria-label="Store highlights">
          <div>
            <span>Catalogue</span>
            <strong>Curated technology</strong>
          </div>
          <div>
            <span>Selection</span>
            <strong>12 product categories</strong>
          </div>
          <div>
            <span>Support</span>
            <strong>Official warranty</strong>
          </div>
          <Link href="#collection" aria-label="Browse all products">
            <FiArrowUpRight />
          </Link>
        </div>
      </div>
    </Hero>
  )
}

const shimmer = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`

const Hero = styled.section`
  background: var(--navy);
  color: white;
  padding: 1rem 1rem 4.5rem;

  .hero__shell {
    ${containerStyles}
    position: relative;
    display: grid;
    min-height: 42rem;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 1.75rem;
    background: var(--navy-light);
  }

  .hero__copy {
    z-index: 2;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 3.5rem 1.5rem 2rem;
  }

  .hero__eyebrow,
  .hero__stay-bar span,
  .hero__caption span {
    color: rgba(255, 255, 255, 0.62);
    font-family: var(--font-utility);
    font-size: 0.68rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1 {
    max-width: 9ch;
    margin: 1rem 0 1.5rem;
    color: white;
  }

  h1 em {
    color: var(--copper);
    font-weight: 400;
  }

  .hero__intro {
    max-width: 34rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.7;
  }

  .hero__cta {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    width: max-content;
    margin-top: 2rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid var(--copper);
    color: white;
    font-weight: 700;
  }

  .hero__cta svg {
    color: var(--copper);
    transition: transform 0.25s ease;
  }
  .hero__cta:hover svg {
    transform: translate(3px, 3px);
  }

  .hero__visual {
    position: relative;
    min-height: 26rem;
    margin: 0 0.75rem 0.75rem;
    overflow: hidden;
    border-radius: 1.2rem;
  }

  .swiper {
    position: absolute;
    inset: 0;
  }
  .swiper-slide {
    position: relative;
  }
  .swiper-slide img {
    object-fit: cover;
  }
  .hero__image-shade {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 45%, rgba(7, 20, 25, 0.75));
  }
  .hero__caption {
    position: absolute;
    bottom: 3rem;
    left: 50%;
    z-index: 2;
    display: grid;
    gap: 0.2rem;
    width: calc(100% - 7rem);
    text-align: center;
    transform: translateX(-50%);
  }
  .hero__caption strong {
    max-width: 28ch;
    margin-inline: auto;
    font-family: var(--font-display);
    font-size: 1.45rem;
    font-weight: 500;
  }

  .hero__controls {
    position: absolute;
    inset: 0;
    z-index: 3;
    pointer-events: none;
  }
  .hero__pagination {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    display: flex;
    gap: 0.4rem;
    transform: translateX(-50%);
    pointer-events: auto;
  }
  .hero__controls > .hero__pagination.swiper-pagination-horizontal {
    right: auto;
    left: 50%;
    width: max-content;
    transform: translateX(-50%);
  }
  .hero__pagination .swiper-pagination-bullet {
    width: 1.6rem;
    height: 2px;
    margin: 0;
    border-radius: 0;
    background: white;
    opacity: 0.35;
  }
  .hero__pagination .swiper-pagination-bullet-active {
    opacity: 1;
    background: var(--copper);
  }
  .hero__arrows {
    position: absolute;
    top: 50%;
    right: 1rem;
    left: 1rem;
    display: flex;
    justify-content: space-between;
    transform: translateY(-50%);
    pointer-events: none;
  }
  .hero__arrows button {
    display: grid;
    place-items: center;
    width: 2.6rem;
    height: 2.6rem;
    border: 1px solid rgba(255, 255, 255, 0.35);
    border-radius: 50%;
    background: rgba(16, 42, 53, 0.45);
    color: white;
    cursor: pointer;
    pointer-events: auto;
    transition:
      background 0.2s ease,
      transform 0.2s ease;
  }
  .hero__arrows button:hover {
    background: var(--copper);
    transform: translateY(-2px);
  }

  .hero__stay-bar {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 1rem;
    align-items: center;
    margin: 0 0.75rem 0.75rem;
    padding: 1.1rem;
    border-radius: 1rem;
    background: white;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.2);
    color: var(--ink);
  }
  .hero__stay-bar > div {
    display: grid;
    gap: 0.15rem;
  }
  .hero__stay-bar > div:nth-child(3) {
    display: none;
  }
  .hero__stay-bar span {
    color: #79848a;
  }
  .hero__stay-bar strong {
    font-size: 0.82rem;
    white-space: nowrap;
  }
  .hero__stay-bar a {
    display: grid;
    place-items: center;
    width: 2.8rem;
    height: 2.8rem;
    border-radius: 50%;
    background: var(--copper);
    color: white;
  }

  @media (min-width: 768px) {
    padding: 1.5rem 1.5rem 5.5rem;
    .hero__shell {
      grid-template-columns: minmax(23rem, 0.85fr) minmax(0, 1.15fr);
      grid-template-rows: minmax(39rem, auto) auto;
      min-height: auto;
    }
    .hero__copy {
      padding: 4.5rem 3rem;
    }
    .hero__visual {
      min-height: auto;
      margin: 0.75rem 0.75rem 0.75rem 0;
    }
    .hero__stay-bar {
      grid-column: 1 / -1;
      grid-template-columns: repeat(3, 1fr) auto;
      margin: 0 0.75rem 0.75rem;
    }
    .hero__stay-bar > div:nth-child(3) {
      display: grid;
    }
  }
`

const SkeletonSlide = styled.div`
  width: 100%;
  height: 100%;
  background: var(--skeleton-gradient);
  background-size: 200% 100%;
  animation: ${shimmer} 1.2s infinite;
`

export default Slider
