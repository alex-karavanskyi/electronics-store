import { useEffect, useState } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { useDebouncedCallback } from 'use-debounce'

import { FilterName } from '@/components/home/filters/filterTypes'
import type { HandleFiltersFn } from '@/components/home/filters/filterTypes'

import { useProductFilters } from './useProductFilters'

export const useProductSearch = (handleFilters: HandleFiltersFn) => {
  const { key, state } = useLocation()
  const navigationType = useNavigationType()
  const isPageCorrection =
    navigationType === 'REPLACE' && state?.catalogPageCorrection === true
  const { filters } = useProductFilters()
  const [text, setText] = useState(filters.text)
  const applySearchDebounced = useDebouncedCallback(
    (value: string) => handleFilters(FilterName.Text, value),
    500
  )

  useEffect(() => {
    if (isPageCorrection) return
    setText(filters.text)
    applySearchDebounced.cancel()
  }, [key, filters.text, applySearchDebounced, isPageCorrection])

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
