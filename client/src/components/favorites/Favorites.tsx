import Breadcrumbs from '@/shared/ui/Breadcrumbs'
import { useFavorites } from './useFavorites'
import FavoritesList from './FavoritesList'
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

  return (
    <div className={styles.container}>
      <div className={styles.favorites__breadcrumbs}>
        <Breadcrumbs name="Favorites" />
      </div>
      <h2 className={styles.favorites__title}>Wishlist</h2>
      {isLoading && <p role="status">Loading your wishlist...</p>}
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
        <FavoritesList
          favoriteIds={favoriteIds}
          canWrite={canWrite}
          error={error}
          removeFavorite={removeFavorite}
          setFavoriteOrder={setFavoriteOrder}
        />
      )}
    </div>
  )
}

export default Favorites
