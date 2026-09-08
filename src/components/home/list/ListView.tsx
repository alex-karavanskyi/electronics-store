'use client'
import { useState } from 'react'

import Image from 'next/image'
import Link from 'next/link'

import { Product } from '@/shared/types/productsType'
import CartButton from '@/shared/ui/CartButton'
import ProductInfo from '@/shared/ui/ProductInfo'
import ListViewSkeleton from '@/shared/ui/skeletons/ListViewSkeleton'

import styles from './ListView.module.scss'

interface ListProductsProps {
  products: Product[]
  isLoading: boolean
}

const ListView = ({ products, isLoading }: ListProductsProps) => {
  const [visibleCount, setVisibleCount] = useState<number>(7)
  const visibleProducts: Product[] = products.slice(0, visibleCount)

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 7)
  }

  return (
    <section className={styles.container}>
      <div className={styles['list__view-products']}>
        {isLoading && <ListViewSkeleton />}
        {!isLoading &&
          visibleProducts.map(product => {
            const { id, image, description } = product
            return (
              <article className={styles['list__view-article']} key={id}>
                <Image
                  alt={product.name}
                  width={300}
                  height={200}
                  priority
                  src={image}
                  className={styles['list__view-image']}
                />

                <div className={styles['list__view-products-info']}>
                  <ProductInfo
                    favoriteClassName={styles['product__info-favorite-icon']}
                    product={product}
                    variant="compact"
                    showHeader={true}
                    showPrice={false}
                  />
                  <div className={styles['list__view-price-cart']}>
                    <ProductInfo
                      favoriteClassName={styles['product__info-favorite-icon']}
                      product={product}
                      variant="compact"
                      showHeader={false}
                      showPrice
                    />

                    <CartButton product={product} />
                  </div>

                  <p className={styles['list__view-products-description']}>
                    {description.substring(0, 150)}...
                  </p>

                  <Link
                    href={`/product/${id}`}
                    className={styles['list__view-products-btn-details']}
                  >
                    Details
                  </Link>
                </div>
              </article>
            )
          })}
      </div>
      {!isLoading && visibleCount < products.length && (
        <button
          className={styles['list__view-load-more-btn']}
          onClick={handleLoadMore}
        >
          Load More
          <span>→</span>
        </button>
      )}
    </section>
  )
}

export default ListView
