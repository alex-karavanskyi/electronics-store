import { AnimatePresence, Reorder } from 'framer-motion'

import {
  removeFavorite,
  reorderFavorite,
  setFavoriteOrder,
} from '@/redux/features/favoriteSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import Breadcrumbs from '@/shared/ui/Breadcrumbs'

import FavoriteItem from './FavoriteItem'
import styles from './Favorites.module.scss'

const Favorites = () => {
  const products = useAppSelector(store => store.favorite.favorites_products)
  const dispatch = useAppDispatch()
  const handlePrepareDrag = () => {
    // Refresh Reorder's cached row positions before starting another gesture.
    dispatch(setFavoriteOrder(products.map(product => product.id)))
  }

  return (
    <div className={styles.container}>
      <div className={styles.favorites__breadcrumbs}>
        <Breadcrumbs name="Favorites" />
      </div>
      <h2 className={styles.favorites__title}>Wishlist</h2>

      {products.length === 0 ? (
        <p className={styles.favorites__empty}>Your wishlist is empty</p>
      ) : (
        <Reorder.Group
          axis="y"
          values={products.map(product => product.id)}
          onReorder={ids => dispatch(setFavoriteOrder(ids))}
          className={styles.favorites__list}
        >
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
                onPrepareDrag={handlePrepareDrag}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
    </div>
  )
}

export default Favorites
