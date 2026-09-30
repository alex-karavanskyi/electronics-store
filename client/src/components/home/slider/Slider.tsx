import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/pagination'

import { useProducts } from '@/shared/hooks/useProducts'
import RequestError from '@/shared/ui/RequestError'

import HeroCopy from './HeroCopy'
import HighlightsBar from './HighlightsBar'
import ProductCarousel from './ProductCarousel'
import styles from './Slider.module.scss'

const MAX_SLIDES = 5

const Slider = () => {
  const {
    data,
    isPending: isLoading,
    error,
    isFetching,
    refetch,
  } = useProducts()
  const slides = (data ?? []).slice(0, MAX_SLIDES)
  const hasProductData = data !== undefined

  return (
    <section className={styles.hero}>
      <div className={styles.hero__shell}>
        <HeroCopy />

        <div className={styles.carouselArea}>
          {error && (
            <RequestError
              message={
                !hasProductData
                  ? 'Unable to load featured products. Please try again.'
                  : 'Could not refresh featured products. Showing previously loaded products.'
              }
              onRetry={() => {
                void refetch()
              }}
              isRetrying={isFetching}
              background={hasProductData}
            />
          )}
          {(!error || hasProductData) && (
            <ProductCarousel slides={slides} isLoading={isLoading} />
          )}
        </div>

        <HighlightsBar />
      </div>
    </section>
  )
}

export default Slider
