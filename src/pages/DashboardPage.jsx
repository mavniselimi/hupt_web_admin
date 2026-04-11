import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { eventsService } from '@/features/events/eventsService'
import { usersService } from '@/features/users/usersService'
import { useAuthStore } from '@/store/authStore'
import { ErrorState, LoadingState } from '@/components/PageState'

export function DashboardPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'Admin'
  const isRegistrar = user?.role === 'Registrar'

  const [stats, setStats] = useState({ events: 0, users: null, created: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        if (isAdmin) {
          const [allEvents, allUsers, created] = await Promise.all([
            eventsService.list(),
            usersService.list(),
            eventsService.myCreated(),
          ])
          setStats({
            events: allEvents.length,
            users: allUsers.length,
            created: created.length,
          })
        } else {
          // Registrar: only events are accessible
          const allEvents = await eventsService.list()
          setStats({ events: allEvents.length, users: null, created: null })
        }
      } catch {
        setError('Could not load dashboard metrics.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isAdmin])

  if (loading) return <LoadingState message="Loading dashboard..." />
  if (error) return <ErrorState message={error} />

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Dashboard</h2>

      {isRegistrar && (
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">
          <p className="font-medium text-white">Registrar workflow</p>
          <p className="mt-1 text-slate-400">
            Go to an event, open the QR registration panel, and scan participant QR codes to register
            them. The scanner stays active for continuous check-in.
          </p>
          <Link
            to="/events"
            className="mt-3 inline-block rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-900"
          >
            Go to Events →
          </Link>
        </div>
      )}

      <div className={`grid gap-4 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-1 max-w-xs'}`}>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-500">Events (total)</p>
          <p className="mt-2 text-2xl font-semibold text-white">{stats.events}</p>
        </div>

        {isAdmin && (
          <>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-sm text-slate-500">Users</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stats.users ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-sm text-slate-500">My created events</p>
              <p className="mt-2 text-2xl font-semibold text-white">{stats.created ?? '—'}</p>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
