import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

// 어느 화면에서나: const { user, profile, isOwner } = useAuth()
export function useAuth() {
  return useContext(AuthContext)
}
