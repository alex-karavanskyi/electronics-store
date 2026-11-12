import { clientEnv } from '@/shared/config/env'

import { combineReducers, configureStore } from '@reduxjs/toolkit'

import cartReducer from '@/redux/features/cartSlice'
import catalogViewReducer from '@/redux/features/catalogViewSlice'

import { persistCartMiddleware } from './middleware/persistCartMiddleware'
import { persistGridViewMiddleware } from './middleware/persistGridViewMiddleware'

const rootReducer = combineReducers({
  cart: cartReducer,
  catalogView: catalogViewReducer,
})

export type RootState = ReturnType<typeof rootReducer>

export const createAppStore = () =>
  configureStore({
    reducer: rootReducer,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware().concat(
        persistCartMiddleware,
        persistGridViewMiddleware
      ),
    devTools: clientEnv.dev,
  })

export const store = createAppStore()

export type AppDispatch = typeof store.dispatch
