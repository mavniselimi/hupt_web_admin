import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '@/features/auth/authService'
import { useAuthStore } from '@/store/authStore'
import { useToast } from '@/hooks/useToast'

const ALLOWED_ROLES = ['Admin', 'Registrar']

export function LoginPage() {
  const { token, user, setAuth } = useAuthStore()
  const toast = useToast()
  const [form, setForm] = useState({ email: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)

  // Already signed in — redirect appropriately
  if (token && user && ALLOWED_ROLES.includes(user.role)) return <Navigate to="/" replace />
  if (token && user && !ALLOWED_ROLES.includes(user.role)) return <Navigate to="/access-denied" replace />

  const onSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const data = await authService.login(form)
      if (!ALLOWED_ROLES.includes(data.user?.role)) {
        toast.show('This account does not have admin or registrar access.', 'error')
        return
      }
      setAuth({ token: data.token, user: data.user })
      toast.show('Signed in')
    } catch {
      toast.show('Login failed.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-xl font-semibold text-white">HUPT Admin</h1>
        <p className="mt-1 text-sm text-slate-500">Administrator / Registrar sign-in</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            required
          />
          <button
            disabled={isLoading}
            className="w-full rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-70"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
