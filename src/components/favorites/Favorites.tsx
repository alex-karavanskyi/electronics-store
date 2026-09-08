'use client'
import Image from 'next/image'

import { AnimatePresence, motion } from 'framer-motion'

import { removeFavorite } from '@/redux/features/favoriteSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { useDragAndDropFavorites } from '@/shared/hooks/useFavorites'
import { Product } from '@/shared/types/productsType'
import Breadcrumbs from '@/shared/ui/Breadcrumbs'
import CartButton from '@/shared/ui/CartButton'
import ProductInfo from '@/shared/ui/ProductInfo'
import { formatPrice } from '@/shared/utils/formatPrice'

import styles from './Favorites.module.scss'

const Favorites = () => {
  const { favorites_products } = useAppSelector(store => store.favorite)
  const dispatch = useAppDispatch()
  const { handleDragStart, handleDragOver, handleDragEnd } =
    useDragAndDropFavorites()

  const handleRemoveFromWishlist = (productId: Product['id']) => {
    dispatch(removeFavorite(productId))
  }

  return (
    <div className={styles.container}>
      <div className={styles.favorites__breadcrumbs}>
        <Breadcrumbs name="Favorites" />
      </div>
      <h2 className={styles.favorites__title}>Wishlist</h2>

      {favorites_products.length === 0 ? (
        <p className={styles.favorites__empty}>Your wishlist is empty</p>
      ) : (
        <motion.ul layout initial={false} className={styles.favorites__list}>
          <AnimatePresence>
            {favorites_products.map((product, index) => (
              <motion.li
                key={product.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                onDragOver={e => handleDragOver(e, index)}
              >
                <div
                  className={styles.favorites__grid}
                  draggable
                  onDragStart={e => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <Image
                    alt={product.name}
                    width={700}
                    height={700}
                    src={product.image}
                    className={styles.favorites__image}
                  />

                  <div className={styles.favorites__info}>
                    <ProductInfo
                      product={product}
                      variant="compact"
                      showHeader={true}
                      showPrice={false}
                      showFavorite={false}
                    />

                    <div className={styles['favorites__price-cart']}>
                      <p className={styles['product__info-price']}>
                        {formatPrice(product.price)}
                      </p>
                      <CartButton product={product} />
                    </div>

                    <button
                      onClick={() => handleRemoveFromWishlist(product.id)}
                      className={styles['favorites__btn-delete']}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  )
}

export default Favorites
