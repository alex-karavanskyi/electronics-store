import { useRef } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import type { Swiper as SwiperInstance } from 'swiper'
import { Autoplay, EffectFade, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

import type { Product } from '@/shared/types/productSchema'
import Image from '@/shared/ui/Image'

import styles from './Slider.module.scss'

type ProductCarouselProps = {
  slides: Product[]
  isLoading: boolean
}

const ProductCarousel = ({ slides, isLoading }: ProductCarouselProps) => {
  const swiperRef = useRef<SwiperInstance | null>(null)

  if (isLoading) {
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

export default ProductCarousel
