import { create } from 'zustand'
import { ApiError, auth } from '../../lib/api'
import type { User } from '../../types'

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  bootstrap: () => Promise<void>
  setUser: (u: User | null) => void
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,
  bootstrap: async () => {
    if (useAuth.getState().initialized) return
    set({ loading: true })
    try {
      const u = await auth.me()
      set({ user: u })
    } catch (e) {
      // Try to refresh once; if that fails too, treat as signed out.
      try {
        if (!(e instanceof ApiError)) throw e
        const u = await auth.refresh()
        set({ user: u })
      } catch {
        set({ user: null })
      }
    } finally {
      set({ loading: false, initialized: true })
    }
  },
  setUser: (u) => set({ user: u }),
  logout: async () => {
    try {
      await auth.logout()
    } catch {
      /* swallow */
    }
    set({ user: null })
  },
}))
