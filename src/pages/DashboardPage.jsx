import { useEffect, useState } from 'react'
import { eventsService } from '@/features/events/eventsService'
import { usersService } from '@/features/users/usersService'
import { ErrorState, LoadingState } from '@/components/PageState'

export function DashboardPage() {
  const [stats, setStats] = useState({ events: 0, users: 0, created: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
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
      } catch {
        setError('Could not load dashboard metrics.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <LoadingState message="Loading dashboard..." />
  if (error) return <ErrorState message={error} />

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Dashboard</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-500">Events (total)</p>
          <p className="mt-2 text-2xl font-semibold text-white">{stats.events}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-500">Users</p>
          <p className="mt-2 text-2xl font-semibold text-white">{stats.users}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm text-slate-500">My created events</p>
          <p className="mt-2 text-2xl font-semibold text-white">{stats.created}</p>
        </div>
      </div>
    </section>
  )
}
