import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usersService } from '@/features/users/usersService'
import { EmptyState, ErrorState, LoadingState } from '@/components/PageState'

export function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await usersService.list()
        setUsers(data)
      } catch {
        setError('Failed to load users (Admin only).')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <LoadingState message="Loading users..." />
  if (error) return <ErrorState message={error} />
  if (!users.length) return <EmptyState message="No users." />

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-white">Users</h2>
      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-800 bg-slate-900 text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">ID</th>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-800/80 last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.id}</td>
                <td className="px-4 py-3 text-white">{u.name}</td>
                <td className="px-4 py-3 text-slate-400">{u.email}</td>
                <td className="px-4 py-3 text-slate-400">{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-600">
        Use the ID column when entering a manual registration on the{' '}
        <Link to="/events" className="text-slate-400 underline">
          Events
        </Link>{' '}
        screen (e.g. <code className="text-slate-500">USER:5</code> or just <code className="text-slate-500">5</code>).
      </p>
    </section>
  )
}
