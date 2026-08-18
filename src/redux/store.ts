import { configureStore } from '@reduxjs/toolkit'

import cartReducer from '@/redux/features/cartSlice'
import favoriteSlice from '@/redux/features/favoriteSlice'
import filterReducer from '@/redux/features/filterSlice'
import modalReducer from '@/redux/features/modalSlice'
import paginationSlice from '@/redux/features/paginationSlice'
import productReducer from '@/redux/features/productSlice'

import { persistCartMiddleware } from './middleware/persistCartMiddleware'
import { persistGridViewMiddleware } from './middleware/persistGridViewMiddleware'
import { persistPaginationMiddleware } from './middleware/persistPaginationMiddleware'

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    favorite: favoriteSlice,
    filter: filterReducer,
    modal: modalReducer,
    pagination: paginationSlice,
    products: productReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(
      persistCartMiddleware,
      persistGridViewMiddleware,
      persistPaginationMiddleware
    ),
  devTools: process.env.NODE_ENV !== 'production',
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
