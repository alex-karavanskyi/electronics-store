'use client'
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

import { loadGridViewFromStorage } from '@/shared/lib/localStorageFilters'
import { FilterState, ProductFilters } from '@/shared/types/productsType'

const initialState: FilterState = {
  grid_view: loadGridViewFromStorage(),
  sort: 'price-lowest',
  filters: { text: '', category: [], price: null },
}

type FilterUpdate = {
  [K in keyof ProductFilters]: { name: K; value: ProductFilters[K] }
}[keyof ProductFilters]

const filterSlice = createSlice({
  name: 'filter',
  initialState,
  reducers: {
    setGridView: state => {
      state.grid_view = true
    },
    setListView: state => {
      state.grid_view = false
    },
    updateSort: (state, action: PayloadAction<string>) => {
      state.sort = action.payload
    },
    updateFilters: (state, { payload }: PayloadAction<FilterUpdate>) => {
      if (payload.name === 'text') state.filters.text = payload.value
      if (payload.name === 'category') state.filters.category = payload.value
      if (payload.name === 'price') state.filters.price = payload.value
    },
    initializeFilters: (
      state,
      { payload }: PayloadAction<ProductFilters & { sort: string }>
    ) => {
      state.filters = {
        text: payload.text,
        category: payload.category,
        price: payload.price,
      }
      state.sort = payload.sort
    },
    clearFilters: state => {
      state.filters = { text: '', category: [], price: null }
      state.sort = 'price-lowest'
    },
  },
})

export const {
  setGridView,
  setListView,
  updateSort,
  updateFilters,
  clearFilters,
  initializeFilters,
} = filterSlice.actions
export default filterSlice.reducer
