'use client'
import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/pagination'
import { useRef } from 'react'

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

import type { Swiper as SwiperInstance } from 'swiper'

const MAX_SLIDES = 5

const highlights = [
  { label: 'Catalogue', value: 'Curated technology' },
  { label: 'Selection', value: '12 product categories' },
  { label: 'Support', value: 'Official warranty' },
] as const

const HeroCopy = () => (
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
)

type ProductCarouselProps = {
  slides: Product[]
  loading: boolean
}

const ProductCarousel = ({ slides, loading }: ProductCarouselProps) => {
  const swiperRef = useRef<SwiperInstance | null>(null)

  if (loading) {
    return (
      <div className="hero__visual">
        <SkeletonSlide />
      </div>
    )
  }

  if (slides.length === 0) {
    return (
      <div className="hero__visual">
        <EmptySlide role="status">
          Featured products will appear here soon.
        </EmptySlide>
      </div>
    )
  }

  const hasMultipleSlides = slides.length > 1

  return (
    <div className="hero__visual">
      <Swiper
        onSwiper={swiper => {
          swiperRef.current = swiper
        }}
        effect="fade"
        loop={hasMultipleSlides}
        speed={900}
        autoplay={
          hasMultipleSlides
            ? { delay: 4500, disableOnInteraction: false }
            : false
        }
        pagination={hasMultipleSlides ? { clickable: true } : false}
        modules={[Autoplay, EffectFade, Pagination]}
      >
        {slides.map((product, index) => (
          <SwiperSlide key={product.id}>
            <Image
              alt={product.name}
              src={product.image}
              fill
              priority={index === 0}
              sizes="(max-width: 768px) 100vw, 58vw"
            />
            <div className="hero__image-shade" />
            <div className="hero__caption">
              <span>Featured product</span>
              <strong>{product.name}</strong>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      {hasMultipleSlides && (
        <div className="hero__controls">
          <div className="hero__arrows">
            <button
              type="button"
              aria-label="Previous product"
              onClick={() => swiperRef.current?.slidePrev()}
            >
              <FiChevronLeft />
            </button>
            <button
              type="button"
              aria-label="Next product"
              onClick={() => swiperRef.current?.slideNext()}
            >
              <FiChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const HighlightsBar = () => (
  <div className="hero__stay-bar" aria-label="Store highlights">
    {highlights.map(({ label, value }) => (
      <div key={label}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    ))}
    <Link href="#collection" aria-label="Browse all products">
      <FiArrowUpRight />
    </Link>
  </div>
)

const Slider = () => {
  const { products, products_loading: loading } = useAppSelector(
    state => state.products
  )
  const slides = products.slice(0, MAX_SLIDES)

  return (
    <Hero>
      <div className="hero__shell">
        <HeroCopy />

        <ProductCarousel slides={slides} loading={loading} />

        <HighlightsBar />
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
    min-width: 0;
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
    max-width: 100%;
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
  .swiper-pagination {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    display: flex;
    gap: 0.4rem;
    transform: translateX(-50%);
    pointer-events: auto;
  }
  .swiper-pagination.swiper-pagination-horizontal {
    right: auto;
    left: 50%;
    width: max-content;
    transform: translateX(-50%);
  }
  .swiper-pagination .swiper-pagination-bullet {
    width: 1.6rem;
    height: 2px;
    margin: 0;
    border-radius: 0;
    background: white;
    opacity: 0.35;
  }
  .swiper-pagination .swiper-pagination-bullet-active {
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
    h1 {
      font-size: clamp(3.25rem, 4.2vw, 5rem);
      line-height: 0.98;
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

const EmptySlide = styled.div`
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 2rem;
  color: rgb(255 255 255 / 70%);
  text-align: center;
`

export default Slider
