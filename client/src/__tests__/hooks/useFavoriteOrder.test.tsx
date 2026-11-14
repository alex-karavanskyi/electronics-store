import { act, renderHook } from '@testing-library/react'
import { useFavoriteOrder } from '@/components/favorites/useFavoriteOrder'

it('keeps the dropped order while persistence is pending and accepts the server order', () => {
  const original = ['a', 'b', 'c']
  const next = ['b', 'a', 'c']
  const { result, rerender } = renderHook(
    ({ favoriteIds, canWrite }) =>
      useFavoriteOrder({ favoriteIds, canWrite, setFavoriteOrder: () => {} }),
    { initialProps: { favoriteIds: original, canWrite: true } }
  )
  act(() => result.current.prepareDrag())
  act(() => result.current.previewOrder(next))
  act(() => result.current.finishDrag())
  expect(result.current.order).toEqual(next)
  rerender({ favoriteIds: original, canWrite: false })
  expect(result.current.order).toEqual(next)
  rerender({ favoriteIds: [...next], canWrite: true })
  expect(result.current.order).toEqual(next)
  rerender({ favoriteIds: ['c', 'b', 'a'], canWrite: true })
  expect(result.current.order).toEqual(['c', 'b', 'a'])
})

it('restores the saved order if persistence fails', () => {
  const favoriteIds = ['a', 'b']
  const { result, rerender } = renderHook(
    ({ error }: { error: Error | null }) =>
      useFavoriteOrder({ favoriteIds, canWrite: true, error, setFavoriteOrder: () => {} }),
    { initialProps: { error: null as Error | null } }
  )
  act(() => result.current.prepareDrag())
  act(() => result.current.previewOrder(['b', 'a']))
  act(() => result.current.finishDrag())
  expect(result.current.order).toEqual(['b', 'a'])
  rerender({ error: new Error('Save failed') })
  expect(result.current.order).toEqual(favoriteIds)
})
