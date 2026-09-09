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
import { Autoplay, EffectFade, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import { useProducts } from '@/shared/hooks/useProducts'
import { Product } from '@/shared/types/productsType'

import styles from './Slider.module.scss'

import type { Swiper as SwiperInstance } from 'swiper'

const MAX_SLIDES = 5

const highlights = [
  { label: 'Catalogue', value: 'Curated technology' },
  { label: 'Selection', value: '12 product categories' },
  { label: 'Support', value: 'Official warranty' },
] as const

const HeroCopy = () => (
  <div className={styles.hero__copy}>
    <p className={styles.hero__eyebrow}>Technology · thoughtfully selected</p>
    <h1>
      Better technology
      <em> for everyday life.</em>
    </h1>
    <p className={styles.hero__intro}>
      Reliable devices for work, home and entertainment — selected for
      performance, quality and long-term value.
    </p>
    <Link href="#collection" className={styles.hero__cta}>
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
      <div className={styles.hero__visual}>
        <div className={styles.skeletonSlide} />
      </div>
    )
  }

  if (slides.length === 0) {
    return (
      <div className={styles.hero__visual}>
        <div className={styles.emptySlide} role="status">
          Featured products will appear here soon.
        </div>
      </div>
    )
  }

  const hasMultipleSlides = slides.length > 1

  return (
    <div className={styles.hero__visual}>
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
            <div className={styles['hero__image-shade']} />
            <div className={styles.hero__caption}>
              <span>Featured product</span>
              <strong>{product.name}</strong>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      {hasMultipleSlides && (
        <div className={styles.hero__controls}>
          <div className={styles.hero__arrows}>
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
  <div className={styles['hero__stay-bar']} aria-label="Store highlights">
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
  const { data: products = [], isPending: loading } = useProducts()
  const slides = products.slice(0, MAX_SLIDES)

  return (
    <section className={styles.hero}>
      <div className={styles.hero__shell}>
        <HeroCopy />

        <ProductCarousel slides={slides} loading={loading} />

        <HighlightsBar />
      </div>
    </section>
  )
}

export default Slider
