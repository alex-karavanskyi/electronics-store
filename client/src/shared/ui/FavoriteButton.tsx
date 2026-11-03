import styles from './FavoriteButton.module.scss'
import { MdFavorite, MdFavoriteBorder } from 'react-icons/md'

import { useFavorites } from '@/components/favorites/useFavorites'
import { Product } from '@/shared/types/productSchema'

interface FavoriteButtonProps {
  product: Product
  classIcon?: string
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  product,
  classIcon,
}) => {
  const { favoriteIds, toggleFavorite, canWrite, isSaving, error } =
    useFavorites()

  const isFavorite = favoriteIds.includes(product.id)

  const handleClick = () => {
    toggleFavorite(product)
  }

  return (
    <button
      type="button"
      className={styles.button}
      aria-label={`Favorite ${product.name}`}
      aria-pressed={isFavorite}
      disabled={!canWrite}
      aria-busy={isSaving}
      title={
        error
          ? 'Your wishlist could not be updated. Open Favorites to retry.'
          : undefined
      }
      onClick={handleClick}
    >
      {isFavorite ? (
        <MdFavorite aria-hidden="true" color="red" className={classIcon} />
      ) : (
        <MdFavoriteBorder aria-hidden="true" className={classIcon} />
      )}
    </button>
  )
}

export default FavoriteButton
