import { useRef } from 'react'

import { reorderFavorite } from '@/redux/features/favoriteSlice'
import { useAppDispatch } from '@/redux/hooks'

export const useDragAndDropFavorites = () => {
  const dispatch = useAppDispatch()
  const draggedIndexRef = useRef<number>(-1)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    draggedIndexRef.current = index
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const draggedIndex = draggedIndexRef.current
    if (draggedIndex === -1 || draggedIndex === dropIndex) return

    const rect = e.currentTarget.getBoundingClientRect()
    const isOverTop = (e.clientY - rect.top) / rect.height < 0.5
    const insertIndex = isOverTop ? dropIndex : dropIndex + 1
    const adjustedInsertIndex =
      insertIndex > draggedIndex ? insertIndex - 1 : insertIndex

    if (adjustedInsertIndex === draggedIndex) return

    dispatch(reorderFavorite({ from: draggedIndex, to: adjustedInsertIndex }))
    draggedIndexRef.current = adjustedInsertIndex
  }

  const handleDragEnd = () => {
    draggedIndexRef.current = -1
  }

  return {
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }
}
