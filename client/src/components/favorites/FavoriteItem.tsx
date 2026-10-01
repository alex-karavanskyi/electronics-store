import { Reorder, useDragControls, useReducedMotion } from 'framer-motion'
import { HiOutlineArrowDown, HiOutlineArrowUp } from 'react-icons/hi2'
import { TbGripVertical } from 'react-icons/tb'

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
  onPrepareDrag: () => void
}

const FavoriteItem = ({
  product,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
  onPrepareDrag,
}: FavoriteItemProps) => {
  const reduceMotion = useReducedMotion()
  const dragControls = useDragControls()

  return (
    <Reorder.Item
      value={product.id}
      className={styles.item}
      dragListener={false}
      dragControls={dragControls}
      dragMomentum={false}
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      whileDrag={{
        scale: reduceMotion ? 1 : 1.01,
        boxShadow: '0 12px 28px rgba(16, 42, 53, 0.16)',
      }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              layout: { type: 'spring', stiffness: 450, damping: 35 },
              duration: 0.18,
            }
      }
    >
      <div className={styles.favorites__grid}>
        <button
          type="button"
          className={styles.dragHandle}
          draggable={false}
          aria-label={`Drag to reorder ${product.name}`}
          aria-keyshortcuts="ArrowUp ArrowDown"
          title="Drag to reorder or use the up and down arrow keys"
          onPointerDown={event => {
            if (event.button !== 0 || event.isPrimary === false) return
            onPrepareDrag()
            dragControls.start(event)
          }}
          onKeyDown={event => {
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              if (canMoveUp) onMoveUp()
            } else if (event.key === 'ArrowDown') {
              event.preventDefault()
              if (canMoveDown) onMoveDown()
            }
          }}
        >
          <TbGripVertical aria-hidden="true" />
        </button>

        <Image
          alt={product.name}
          width={700}
          height={700}
          src={product.image}
          draggable={false}
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
          <button
            type="button"
            onClick={onRemove}
            className={styles['favorites__btn-delete']}
          >
            Delete
          </button>
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
            title="Move up"
            onClick={onMoveUp}
          >
            <HiOutlineArrowUp aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={!canMoveDown}
            aria-label={`Move ${product.name} down`}
            title="Move down"
            onClick={onMoveDown}
          >
            <HiOutlineArrowDown aria-hidden="true" />
          </button>
        </div>
      </div>
    </Reorder.Item>
  )
}

export default FavoriteItem
