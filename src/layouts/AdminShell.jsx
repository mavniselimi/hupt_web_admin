import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const NAV_ADMIN = [
  { to: '/', label: 'Dashboard' },
  { to: '/events', label: 'Events' },
  { to: '/users', label: 'Users' },
]

// Registrars only need Dashboard + Events (no user management)
const NAV_REGISTRAR = [
  { to: '/', label: 'Dashboard' },
  { to: '/events', label: 'Events' },
]

export function AdminShell() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const isRegistrar = user?.role === 'Registrar'
  const nav = isRegistrar ? NAV_REGISTRAR : NAV_ADMIN

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
        <aside className="hidden w-56 shrink-0 border-r border-slate-800 bg-slate-900 p-4 md:block">
          <div className="mb-1 text-sm font-semibold tracking-tight text-white">HUPT Admin</div>
          {isRegistrar && (
            <div className="mb-5 mt-1 rounded px-1 py-0.5 text-xs text-slate-500">
              Registrar mode
            </div>
          )}
          {!isRegistrar && <div className="mb-5" />}
          <nav className="space-y-1">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm ${
                    isActive ? 'bg-white text-slate-900' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur md:px-6">
            <div>
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-slate-500">
                {user?.email}
                {isRegistrar && (
                  <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-slate-400">
                    Registrar
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
            >
              Logout
            </button>
          </header>

          <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">
            <Outlet />
          </main>

          <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-900 md:hidden">
            <div className={`grid grid-cols-${nav.length}`}>
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `px-1 py-3 text-center text-xs ${
                      isActive ? 'font-semibold text-white' : 'text-slate-500'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}
