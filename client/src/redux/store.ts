import { clientEnv } from '@/shared/config/env'

import { configureStore } from '@reduxjs/toolkit'

import cartReducer from '@/redux/features/cartSlice'
import favoriteSlice from '@/redux/features/favoriteSlice'
import catalogViewReducer from '@/redux/features/catalogViewSlice'
import modalReducer from '@/redux/features/modalSlice'

import { persistCartMiddleware } from './middleware/persistCartMiddleware'
import { persistGridViewMiddleware } from './middleware/persistGridViewMiddleware'

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    favorite: favoriteSlice,
    catalogView: catalogViewReducer,
    modal: modalReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(
      persistCartMiddleware,
      persistGridViewMiddleware
    ),
  devTools: clientEnv.dev,
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
