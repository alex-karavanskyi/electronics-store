import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  isOpen: false,
}

const modalSlice = createSlice({
  name: 'modal',
  initialState,
  reducers: {
    toggleModal: state => {
      state.isOpen = !state.isOpen
    },
    closeModal: state => {
      state.isOpen = false
    },
  },
})

export const { toggleModal, closeModal } = modalSlice.actions

export default modalSlice.reducer
