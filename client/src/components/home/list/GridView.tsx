import Image from '@/shared/ui/Image'
import { Link } from 'react-router-dom'

import { FaSearch } from 'react-icons/fa'

import { Product } from '@/shared/types/productSchema'
import CartButton from '@/shared/ui/CartButton'
import FavoriteButton from '@/shared/ui/FavoriteButton'
import ProductHeader from '@/shared/ui/ProductHeader'
import ProductPrice from '@/shared/ui/ProductPrice'
import GridViewSkeleton from './GridViewSkeleton'

import styles from './GridView.module.scss'

interface GridProducts {
  products: Product[]
  isLoading: boolean
}

const GridView: React.FC<GridProducts> = ({ products, isLoading }) => {
  return (
    <section className={styles.container}>
      <div className={styles['grid__view-products']} role="list">
        {isLoading && <GridViewSkeleton />}

        {!isLoading &&
          products.map(product => {
            const { id, image } = product

            return (
              <article
                key={id}
                className={styles['grid__view-product']}
                role="listitem"
              >
                <div className={styles['grid__view-products-images']}>
                  <Image
                    src={image}
                    alt={product.name}
                    width={470}
                    height={500}
                    className={styles['grid__view-images']}
                  />

                  <Link
                    aria-label={`View ${product.name}`}
                    to={`/product/${encodeURIComponent(id)}`}
                    className={styles['grid__view-products-link']}
                  >
                    <FaSearch aria-hidden="true" />
                  </Link>
                </div>

                <footer className={styles['grid__view-footer']}>
                  <ProductHeader name={product.name}>
                    <FavoriteButton
                      product={product}
                      classIcon={styles['product__info-favorite-icon']}
                    />
                  </ProductHeader>

                  <div className={styles['grid__view-price-cart']}>
                    <ProductPrice price={product.price} />
                    <CartButton product={product} />
                  </div>
                </footer>
              </article>
            )
          })}
      </div>
    </section>
  )
}

export default GridView
