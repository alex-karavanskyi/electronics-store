import Modal from '@/shared/ui/Modal'
import { lazy, Suspense, useState } from 'react'

import { Link, useParams } from 'react-router-dom'

import { HiOutlineShoppingCart } from 'react-icons/hi2'

import { Loading } from '@/layout'
import { addToCart } from '@/redux/features/cartSlice'
import { useAppDispatch } from '@/redux/hooks'
import { useProduct } from '@/shared/hooks/useProducts'
import { Breadcrumbs } from '@/shared/ui'
import ProductInfo from '@/shared/ui/ProductInfo'
import RequestError from '@/shared/ui/RequestError'
import { ApiError } from '@/shared/api/http'

import ProductImages from './ProductImages'
import styles from './SingleProduct.module.scss'

const Chat = lazy(() => import('@/components/chat/Chat'))

const SingleProduct = () => {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const { id } = useParams()
  const {
    data: product,
    isPending: loading,
    error,
    isFetching,
    refetch,
  } = useProduct(id ?? '')
  const dispatch = useAppDispatch()

  if (loading) return <Loading />
  if (error && !product) {
    return (
      <div className={styles.container}>
        {error instanceof ApiError && error.status === 404 ? (
          <section>
            <h1>Product not found</h1>
            <p>This product is unavailable or no longer exists.</p>
          </section>
        ) : (
          <RequestError
            message="Unable to load product. Please try again."
            onRetry={() => {
              void refetch()
            }}
            isRetrying={isFetching}
          />
        )}
        <Link to="/">Back to catalog</Link>
      </div>
    )
  }
  if (!product) return null

  const { description, images } = product

  return (
    <div className={styles.container}>
      <Breadcrumbs name={product.name} />
      {error && (
        <RequestError
          message="Could not refresh product. Showing previously loaded details."
          onRetry={() => {
            void refetch()
          }}
          isRetrying={isFetching}
          background
        />
      )}
      <div className={styles['single__product-container']}>
        <ProductImages images={images} onChatOpen={() => setIsChatOpen(true)} />
        <section className={styles['single__product-info']}>
          <ProductInfo
            favoriteClassName={styles['product__info-favorite-icon']}
            product={product}
            variant="detailed"
            showHeader
            showPrice
            priceTag="h5"
          />

          <button
            type="button"
            className={styles['single__product-buy-button']}
            aria-label={`Buy ${product.name}`}
            onClick={() => {
              dispatch(addToCart(product))
            }}
          >
            <HiOutlineShoppingCart />
            <span>Buy now</span>
          </button>
          <p className={styles['single__product-description']}>{description}</p>
          <hr />
        </section>
      </div>

      {isChatOpen && (
        <Modal
          className={styles.chatModal}
          label="Product assistant"
          onClose={() => setIsChatOpen(false)}
        >
          <div
            aria-hidden="true"
            className={styles.chatOverlay}
            onClick={() => setIsChatOpen(false)}
          />
          <div className={styles.chatContent}>
            <div className={styles.chatHeader}>
              <button
                className={styles.closeButton}
                onClick={() => setIsChatOpen(false)}
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>
            <div className={styles.chatWrapper}>
              <Suspense fallback={<p role="status">Loading assistant...</p>}>
                <Chat product={product} />
              </Suspense>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default SingleProduct
