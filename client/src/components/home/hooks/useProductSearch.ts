import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useDebouncedCallback } from 'use-debounce'

import { FilterName } from '@/components/home/filters/filterTypes'
import type { HandleFiltersFn } from '@/components/home/filters/filterTypes'

import { useProductFilters } from './useProductFilters'

export const useProductSearch = (handleFilters: HandleFiltersFn) => {
  const { key } = useLocation()
  const { filters } = useProductFilters()
  const [text, setText] = useState(filters.text)
  const applySearchDebounced = useDebouncedCallback(
    (value: string) => handleFilters(FilterName.Text, value),
    500
  )

  useEffect(() => {
    setText(filters.text)
    applySearchDebounced.cancel()
  }, [key, filters.text, applySearchDebounced])

  useEffect(() => () => applySearchDebounced.cancel(), [applySearchDebounced])

  const changeText = (value: string) => {
    setText(value)
    applySearchDebounced(value)
  }

  const clearSearch = () => {
    applySearchDebounced.cancel()
    setText('')
    handleFilters(FilterName.Text, '')
  }

  return { text, changeText, clearSearch }
}
