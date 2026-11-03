import { clientEnv } from '@/shared/config/env'

import { configureStore } from '@reduxjs/toolkit'

import cartReducer from '@/redux/features/cartSlice'
import catalogViewReducer from '@/redux/features/catalogViewSlice'

import { persistCartMiddleware } from './middleware/persistCartMiddleware'
import { persistGridViewMiddleware } from './middleware/persistGridViewMiddleware'

export const createAppStore = () =>
  configureStore({
    reducer: {
      cart: cartReducer,
      catalogView: catalogViewReducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(
        persistCartMiddleware,
        persistGridViewMiddleware
      ),
    devTools: clientEnv.dev,
  })

export const store = createAppStore()

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
