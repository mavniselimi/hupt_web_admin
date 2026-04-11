import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/features/auth/authService'

export function AdminProtectedRoute({ children }) {
  const { token, user, setUser, logout, isHydrated, hydrateDone } = useAuthStore()

  useEffect(() => {
    async function bootstrap() {
      if (!token) {
        hydrateDone()
        return
      }
      if (!user) {
        try {
          const me = await authService.me()
          setUser(me)
        } catch {
          logout()
        } finally {
          hydrateDone()
        }
      } else {
        hydrateDone()
      }
    }
    bootstrap()
  }, [token, user, setUser, logout, hydrateDone])

  if (!token) return <Navigate to="/login" replace />
  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
        Loading session...
      </div>
    )
  }
  if (!['Admin', 'Registrar'].includes(user?.role)) {
    return <Navigate to="/access-denied" replace />
  }

  return children
}
