import { useState } from 'react'

import { Link, useParams } from 'react-router-dom'

import { HiOutlineShoppingCart } from 'react-icons/hi2'

import { Loading } from '@/layout'
import { addToCart } from '@/redux/features/cartSlice'
import { useAppDispatch } from '@/redux/hooks'
import { useProduct } from '@/shared/hooks/useProducts'
import { Breadcrumbs } from '@/shared/ui'
import FavoriteButton from '@/shared/ui/FavoriteButton'
import ProductHeader from '@/shared/ui/ProductHeader'
import ProductPrice from '@/shared/ui/ProductPrice'
import RequestError from '@/shared/ui/RequestError'
import { ApiError } from '@/shared/api/http'

import ProductChatModal from './ProductChatModal'
import ProductImages from './ProductImages'
import styles from './SingleProduct.module.scss'

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
        <ProductImages
          images={images}
          productName={product.name}
          onChatOpen={() => setIsChatOpen(true)}
        />
        <section className={styles['single__product-info']}>
          <div className={styles.productSummary}>
            <ProductHeader name={product.name} variant="detailed">
              <FavoriteButton
                product={product}
                classIcon={styles['product__info-favorite-icon']}
              />
            </ProductHeader>
            <ProductPrice price={product.price} variant="detailed" as="h5" />
          </div>

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
        <ProductChatModal
          productId={product.id}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  )
}

export default SingleProduct
