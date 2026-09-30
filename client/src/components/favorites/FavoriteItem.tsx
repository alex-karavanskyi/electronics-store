import type { DragEventHandler } from 'react'
import { motion } from 'framer-motion'

import type { Product } from '@/shared/types/productSchema'
import CartButton from '@/shared/ui/CartButton'
import Image from '@/shared/ui/Image'
import ProductHeader from '@/shared/ui/ProductHeader'
import { formatPrice } from '@/shared/utils/formatPrice'

import styles from './Favorites.module.scss'

type FavoriteItemProps = {
  product: Product
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  onDragStart: DragEventHandler<HTMLDivElement>
  onDragOver: DragEventHandler<HTMLLIElement>
  onDragEnd: DragEventHandler<HTMLDivElement>
}

const FavoriteItem = ({
  product,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
}: FavoriteItemProps) => (
  <motion.li
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    onDragOver={onDragOver}
  >
    <div
      className={styles.favorites__grid}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <Image
        alt={product.name}
        width={700}
        height={700}
        src={product.image}
        className={styles.favorites__image}
      />

      <div className={styles.favorites__info}>
        <ProductHeader name={product.name} />

        <div className={styles['favorites__price-cart']}>
          <p className={styles['product__info-price']}>
            {formatPrice(product.price)}
          </p>
          <CartButton product={product} />
        </div>

        <div
          className={styles.reorder}
          role="group"
          aria-label={`Reorder ${product.name}`}
        >
          <button
            type="button"
            disabled={!canMoveUp}
            aria-label={`Move ${product.name} up`}
            onClick={onMoveUp}
          >
            Move up
          </button>
          <button
            type="button"
            disabled={!canMoveDown}
            aria-label={`Move ${product.name} down`}
            onClick={onMoveDown}
          >
            Move down
          </button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className={styles['favorites__btn-delete']}
        >
          Delete
        </button>
      </div>
    </div>
  </motion.li>
)

export default FavoriteItem
