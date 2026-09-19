import { Middleware } from '@reduxjs/toolkit'

import { GRID_VIEW_STORAGE_KEY } from '@/shared/constants/localStorage'

import { setGridView, setListView } from '../features/catalogViewSlice'

export const persistGridViewMiddleware: Middleware =
  _store => next => action => {
    const result = next(action)

    try {
      if (typeof window !== 'undefined') {
        if (action.type === setGridView.type) {
          localStorage.setItem(GRID_VIEW_STORAGE_KEY, 'true')
        }
        if (action.type === setListView.type) {
          localStorage.setItem(GRID_VIEW_STORAGE_KEY, 'false')
        }
      }
    } catch {
      // Keep the view usable when storage is blocked or full.
    }
    return result
  }
