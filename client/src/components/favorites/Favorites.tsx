import { AnimatePresence, motion } from 'framer-motion'

import { removeFavorite, reorderFavorite } from '@/redux/features/favoriteSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { useDragAndDropFavorites } from './useDragAndDropFavorites'
import Breadcrumbs from '@/shared/ui/Breadcrumbs'

import FavoriteItem from './FavoriteItem'
import styles from './Favorites.module.scss'

const Favorites = () => {
  const products = useAppSelector(store => store.favorite.favorites_products)
  const dispatch = useAppDispatch()
  const { handleDragStart, handleDragOver, handleDragEnd } =
    useDragAndDropFavorites()

  return (
    <div className={styles.container}>
      <div className={styles.favorites__breadcrumbs}>
        <Breadcrumbs name="Favorites" />
      </div>
      <h2 className={styles.favorites__title}>Wishlist</h2>

      {products.length === 0 ? (
        <p className={styles.favorites__empty}>Your wishlist is empty</p>
      ) : (
        <motion.ul layout initial={false} className={styles.favorites__list}>
          <AnimatePresence>
            {products.map((product, index) => (
              <FavoriteItem
                key={product.id}
                product={product}
                canMoveUp={index > 0}
                canMoveDown={index < products.length - 1}
                onMoveUp={() =>
                  dispatch(reorderFavorite({ from: index, to: index - 1 }))
                }
                onMoveDown={() =>
                  dispatch(reorderFavorite({ from: index, to: index + 1 }))
                }
                onRemove={() => dispatch(removeFavorite(product.id))}
                onDragStart={event => handleDragStart(event, index)}
                onDragOver={event => handleDragOver(event, index)}
                onDragEnd={handleDragEnd}
              />
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </div>
  )
}

export default Favorites
