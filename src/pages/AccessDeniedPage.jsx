import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function AccessDeniedPage() {
  const navigate = useNavigate()
  const { logout, token } = useAuthStore()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
        <h1 className="text-lg font-semibold text-white">Access denied</h1>
        <p className="mt-2 text-sm text-slate-400">
          This area is restricted to Admin accounts. Use the public app with a User account, or sign in with an Admin
          user.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {token ? (
            <button
              type="button"
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900"
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
