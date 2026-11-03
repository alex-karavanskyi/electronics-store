import { AnimatePresence, Reorder } from 'framer-motion'
import { useState } from 'react'
import Breadcrumbs from '@/shared/ui/Breadcrumbs'
import { useFavorites } from './useFavorites'
import FavoriteRow from './FavoriteRow'
import styles from './Favorites.module.scss'
import RequestError from '@/shared/ui/RequestError'

const Favorites = () => {
  const {
    favoriteIds,
    storageAvailable,
    removeFavorite,
    setFavoriteOrder,
    isLoading,
    isSaving,
    canWrite,
    error,
    retry,
    hasPendingImport,
    discardImport,
  } = useFavorites()
  const [drag, setDrag] = useState<{ base: string[]; order: string[] } | null>(
    null
  )
  const order = drag?.base === favoriteIds ? drag.order : favoriteIds
  const handlePrepareDrag = () => {
    if (!canWrite) return
    // Refresh Reorder's cached row positions before starting another gesture.
    setDrag({ base: favoriteIds, order: [...favoriteIds] })
  }
  const handleFinishDrag = () => {
    if (drag?.base === favoriteIds) setFavoriteOrder(drag.order)
    setDrag(null)
  }
  const move = (from: number, to: number) => {
    if (!canWrite || to < 0 || to >= order.length) return
    const next = [...order]
    const [id] = next.splice(from, 1)
    next.splice(to, 0, id)
    setFavoriteOrder(next)
    setDrag(null)
  }

  return (
    <div className={styles.container}>
      <div className={styles.favorites__breadcrumbs}>
        <Breadcrumbs name="Favorites" />
      </div>
      <h2 className={styles.favorites__title}>Wishlist</h2>
      {isLoading && <p role="status">Loading your wishlist...</p>}
      {isSaving && <p role="status">Saving your wishlist...</p>}
      {error && (
        <RequestError
          message={
            error instanceof Error
              ? error.message
              : 'Unable to load your wishlist.'
          }
          onRetry={retry}
          isRetrying={isLoading || isSaving}
        />
      )}
      {error && hasPendingImport && (
        <p>
          Your saved account favorites are available. Remove items to make room
          and retry, or discard the pending guest import.{' '}
          <button
            type="button"
            disabled={!canWrite}
            onClick={() => {
              if (
                window.confirm(
                  'Discard this guest import? Guest items in this transfer will be removed from this device. Your saved account favorites will stay unchanged.'
                )
              )
                discardImport()
            }}
          >
            Discard guest import
          </button>
        </p>
      )}
      {!storageAvailable && (
        <p role="status">
          Your wishlist is available in this tab, but could not be saved on this
          device.
        </p>
      )}

      {favoriteIds.length === 0 ? (
        !isLoading &&
        !error && (
          <p className={styles.favorites__empty}>Your wishlist is empty</p>
        )
      ) : (
        <Reorder.Group
          axis="y"
          values={order}
          onReorder={ids => setDrag({ base: favoriteIds, order: ids })}
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
                onPrepareDrag={handlePrepareDrag}
                onFinishDrag={handleFinishDrag}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}
    </div>
  )
}

export default Favorites
