import { createSlice } from '@reduxjs/toolkit'
import { loadGridViewFromStorage } from '@/shared/lib/filtersStorage'
const catalogViewSlice = createSlice({
  name: 'catalogView',
  initialState: { grid_view: loadGridViewFromStorage() },
  reducers: {
    setGridView: state => {
      state.grid_view = true
    },
    setListView: state => {
      state.grid_view = false
    },
  },
})
export const { setGridView, setListView } = catalogViewSlice.actions
export default catalogViewSlice.reducer
