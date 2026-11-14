import { AnimatePresence, Reorder } from 'framer-motion'
import FavoriteRow from './FavoriteRow'
import { useFavoriteOrder } from './useFavoriteOrder'
import styles from './Favorites.module.scss'

type Props = {
  favoriteIds: string[]
  canWrite: boolean
  error?: unknown
  removeFavorite: (id: string) => void
  setFavoriteOrder: (ids: string[]) => void
}

export default function FavoritesList({
  favoriteIds,
  canWrite,
  error,
  removeFavorite,
  setFavoriteOrder,
}: Props) {
  const { order, prepareDrag, finishDrag, move, previewOrder } =
    useFavoriteOrder({ favoriteIds, canWrite, error, setFavoriteOrder })
  return (
    <Reorder.Group
      axis="y"
      values={order}
      onReorder={previewOrder}
      className={styles.favorites__list}
    >
      <AnimatePresence>
        {order.map((id, index) => (
          <FavoriteRow
            key={id}
            id={id}
            disabled={!canWrite}
            canMoveUp={canWrite && index > 0}
            canMoveDown={canWrite && index < order.length - 1}
            onMoveUp={() => move(index, index - 1)}
            onMoveDown={() => move(index, index + 1)}
            onRemove={() => removeFavorite(id)}
            onPrepareDrag={prepareDrag}
            onFinishDrag={finishDrag}
          />
        ))}
      </AnimatePresence>
    </Reorder.Group>
  )
}
