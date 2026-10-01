import { useState } from 'react'

import Image from '@/shared/ui/Image'
import { Link } from 'react-router-dom'

import { Product } from '@/shared/types/productSchema'
import CartButton from '@/shared/ui/CartButton'
import FavoriteButton from '@/shared/ui/FavoriteButton'
import ProductHeader from '@/shared/ui/ProductHeader'
import ProductPrice from '@/shared/ui/ProductPrice'
import ListViewSkeleton from './ListViewSkeleton'

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
        {isLoading && <ListViewSkeleton count={visibleCount} />}
        {!isLoading &&
          visibleProducts.map(product => {
            const { id, image, description } = product
            return (
              <article className={styles['list__view-article']} key={id}>
                <Image
                  alt={product.name}
                  width={300}
                  height={200}
                  src={image}
                  className={styles['list__view-image']}
                />

                <div className={styles['list__view-products-info']}>
                  <ProductHeader name={product.name}>
                    <FavoriteButton
                      product={product}
                      classIcon={styles['product__info-favorite-icon']}
                    />
                  </ProductHeader>
                  <div className={styles['list__view-price-cart']}>
                    <ProductPrice price={product.price} />

                    <CartButton product={product} />
                  </div>

                  <p className={styles['list__view-products-description']}>
                    {description.substring(0, 150)}...
                  </p>

                  <Link
                    to={`/product/${encodeURIComponent(id)}`}
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
