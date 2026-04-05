import { create } from 'zustand'
import { tokenStorage } from '@/services/tokenStorage'

export const useAuthStore = create((set) => ({
  token: tokenStorage.get(),
  user: null,
  isHydrated: false,
  setAuth: ({ token, user }) =>
    set(() => {
      tokenStorage.set(token)
      return { token, user, isHydrated: true }
    }),
  setUser: (user) => set({ user }),
  hydrateDone: () => set({ isHydrated: true }),
  logout: () =>
    set(() => {
      tokenStorage.clear()
      return { token: null, user: null, isHydrated: true }
    }),
}))
