import { useState } from 'react'

type Options = {
  favoriteIds: string[]
  canWrite: boolean
  error?: unknown
  setFavoriteOrder: (ids: string[]) => void
}

// Keep the draft until persistence publishes a new list or reports an error.
export function useFavoriteOrder({
  favoriteIds,
  canWrite,
  error,
  setFavoriteOrder,
}: Options) {
  const [drag, setDrag] = useState<{ base: string[]; order: string[]; error: unknown } | null>(
    null
  )
  const isCurrent = drag?.base === favoriteIds && drag.error === error
  const order = isCurrent ? drag.order : favoriteIds
  const prepareDrag = () => {
    if (!canWrite) return
    // Refresh Reorder's cached row positions before starting another gesture.
    setDrag({ base: favoriteIds, order: [...order], error })
  }
  const finishDrag = () => {
    if (canWrite && isCurrent) setFavoriteOrder(drag.order)
  }
  const move = (from: number, to: number) => {
    if (!canWrite || to < 0 || to >= order.length) return
    const next = [...order]
    const [id] = next.splice(from, 1)
    next.splice(to, 0, id)
    setDrag({ base: favoriteIds, order: next, error })
    setFavoriteOrder(next)
  }
  return {
    order,
    prepareDrag,
    finishDrag,
    move,
    previewOrder: (ids: string[]) => setDrag({ base: favoriteIds, order: ids, error }),
  }
}
