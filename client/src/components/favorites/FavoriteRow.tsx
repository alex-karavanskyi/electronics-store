import type { ComponentProps } from 'react'
import { Reorder } from 'framer-motion'
import { useProduct } from '@/shared/hooks/useProducts'
import { ApiError } from '@/shared/api/http'
import RequestError from '@/shared/ui/RequestError'
import FavoriteItem from './FavoriteItem'
import styles from './Favorites.module.scss'

type Props = Omit<ComponentProps<typeof FavoriteItem>, 'product' | 'notice'> & {
  id: string
}

export default function FavoriteRow({ id, ...actions }: Props) {
  const { data, error, isPending, isFetching, refetch } = useProduct(id)
  const missing =
    data === null || (error instanceof ApiError && error.status === 404)
  const product = !missing && data?.id === id ? data : undefined
  const notice = missing ? (
    <p>This product is no longer available.</p>
  ) : error || (!isPending && !product) ? (
    <RequestError
      message={
        product
          ? 'Could not refresh this product. Showing saved details.'
          : 'Unable to load this favorite.'
      }
      onRetry={() => {
        void refetch()
      }}
      isRetrying={isFetching}
      background={Boolean(product)}
    />
  ) : null

  if (product)
    return <FavoriteItem product={product} notice={notice} {...actions} />

  return (
    <Reorder.Item value={id} drag={false} className={styles.item}>
      {isPending ? <p role="status">Loading favorite...</p> : notice}
      <button
        type="button"
        onClick={actions.onRemove}
        disabled={actions.disabled}
        aria-label="Remove unavailable favorite"
      >
        Remove
      </button>
      <button
        type="button"
        disabled={!actions.canMoveUp}
        onClick={actions.onMoveUp}
      >
        Move up
      </button>
      <button
        type="button"
        disabled={!actions.canMoveDown}
        onClick={actions.onMoveDown}
      >
        Move down
      </button>
    </Reorder.Item>
  )
}
