import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/pagination'

import { useHomeProducts } from '@/shared/hooks/useProducts'
import RequestError from '@/shared/ui/RequestError'

import HeroCopy from './HeroCopy'
import HighlightsBar from './HighlightsBar'
import ProductCarousel from './ProductCarousel'
import styles from './Slider.module.scss'

const Slider = () => {
  const {
    data,
    isPending: isLoading,
    error,
    isFetching,
    refetch,
  } = useHomeProducts()
  const slides = data?.featured ?? []
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
