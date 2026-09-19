import styles from './FavoriteButton.module.scss'
import { MdFavorite, MdFavoriteBorder } from 'react-icons/md'

import { toggleFavorite } from '@/redux/features/favoriteSlice'
import { useAppDispatch, useAppSelector } from '@/redux/hooks'
import { Product } from '@/shared/types/productsType'

interface FavoriteButtonProps {
  product: Product
  classIcon?: string
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  product,
  classIcon,
}) => {
  const { favorites_products } = useAppSelector(store => store.favorite)
  const dispatch = useAppDispatch()

  const isFavorite = favorites_products.some(p => p.id === product.id)

  const handleClick = () => {
    dispatch(toggleFavorite(product))
  }

  return (
    <button
      type="button"
      className={styles.button}
      aria-label={`Favorite ${product.name}`}
      aria-pressed={isFavorite}
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
