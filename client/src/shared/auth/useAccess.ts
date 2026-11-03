import { createContext, useContext } from 'react'

export type Access = {
  status: 'unavailable' | 'loading' | 'guest' | 'authenticated'
  userId: string | null
  isAdmin: boolean
  getToken: () => Promise<string | null>
}

export const unavailableAccess: Access = {
  status: 'unavailable',
  userId: null,
  isAdmin: false,
  getToken: async () => null,
}

export const AccessContext = createContext<Access>(unavailableAccess)

export const useAccess = () => useContext(AccessContext)
