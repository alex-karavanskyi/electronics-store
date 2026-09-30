import { z } from 'zod'
import { GRID_VIEW_STORAGE_KEY } from '@/shared/constants/localStorage'

export const loadGridViewFromStorage = (): boolean => {
  try {
    if (typeof window === 'undefined') return true
    const parsed = z
      .enum(['true', 'false'])
      .safeParse(localStorage.getItem(GRID_VIEW_STORAGE_KEY))
    return parsed.success ? parsed.data === 'true' : true
  } catch {
    return true
  }
}
