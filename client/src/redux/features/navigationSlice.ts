import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  isOpen: false,
}

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    toggleNavigation: state => {
      state.isOpen = !state.isOpen
    },
    closeNavigation: state => {
      state.isOpen = false
    },
  },
})

export const { toggleNavigation, closeNavigation } = navigationSlice.actions

export default navigationSlice.reducer
