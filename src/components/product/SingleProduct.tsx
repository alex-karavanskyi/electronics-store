'use client'
import { useEffect, useState } from 'react'

import { useParams } from 'next/navigation'

import { HiOutlineShoppingCart } from 'react-icons/hi2'

import Chat from '@/components/chat/Chat'
import { Error, Loading } from '@/layout'
import { addToCart } from '@/redux/features/cartSlice'
import { getSingleProduct } from '@/redux/features/productSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { url } from '@/shared/constants/db'
import { Breadcrumbs } from '@/shared/ui'
import ProductInfo from '@/shared/ui/ProductInfo'

import ProductImages from './ProductImages'
import styles from './SingleProduct.module.scss'

const SingleProduct = () => {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const {
    single_product_loading: loading,
    single_product_error: error,
    single_product: product,
  } = useAppSelector(store => store.products)

  const { id } = useParams()

  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(getSingleProduct(`${url}/${id}`))
  }, [dispatch, id])

  if (loading) return <Loading />
  if (error) {
    return (
      <Error
        message="Oops! Something went wrong. Try again later."
        redirectTo="/"
        redirectDelay={3000}
      />
    )
  }
  if (!product) return null

  const { description, images } = product

  return (
    <main className={styles.container}>
      <Breadcrumbs name={product.name} />
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
        <div className={styles.chatModal}>
          <div
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
              <Chat product={product} />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default SingleProduct
