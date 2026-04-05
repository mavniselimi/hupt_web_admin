import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { eventsService } from '@/features/events/eventsService'
import { sessionsService } from '@/features/sessions/sessionsService'
import { usersService } from '@/features/users/usersService'
import { formatDateTime, localInputToIso } from '@/utils/formatters'
import { EmptyState, ErrorState, LoadingState } from '@/components/PageState'
import { QrRegistrationPanel } from '@/components/QrRegistrationPanel'
import { useToast } from '@/hooks/useToast'

const emptySession = {
  title: '',
  description: '',
  speaker: '',
  startLocal: '',
  endLocal: '',
}

export function EventDetailPage() {
  const { eventId } = useParams()
  const toast = useToast()
  const [event, setEvent] = useState(null)
  const [sessions, setSessions] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sessionForm, setSessionForm] = useState(emptySession)
  const [removeUserId, setRemoveUserId] = useState('')
  const [savingSession, setSavingSession] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ev, sess, usr] = await Promise.all([
        eventsService.detail(eventId),
        sessionsService.byEvent(eventId),
        usersService.list(),
      ])
      setEvent(ev)
      setSessions(sess)
      setUsers(usr)
    } catch {
      setError('Failed to load event.')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    load()
  }, [load])

  const createSession = async (e) => {
    e.preventDefault()
    const startTime = localInputToIso(sessionForm.startLocal)
    const endTime = localInputToIso(sessionForm.endLocal)
    if (!startTime || !endTime) {
      toast.show('Set session start and end.', 'error')
      return
    }
    setSavingSession(true)
    try {
      await sessionsService.create(eventId, {
        title: sessionForm.title,
        description: sessionForm.description || undefined,
        speaker: sessionForm.speaker || undefined,
        startTime,
        endTime,
      })
      toast.show('Session created')
      setSessionForm(emptySession)
      load()
    } catch {
      toast.show('Could not create session.', 'error')
    } finally {
      setSavingSession(false)
    }
  }

  const removeUser = async (e) => {
    e.preventDefault()
    if (!removeUserId) return
    try {
      await eventsService.removeUser(eventId, removeUserId)
      toast.show('User removed from event')
      setRemoveUserId('')
      load()
    } catch {
      toast.show('Remove failed.', 'error')
    }
  }

  if (loading) return <LoadingState message="Loading event..." />
  if (error) return <ErrorState message={error} />
  if (!event) return <EmptyState message="Event not found." />

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/events" className="text-xs text-slate-500 hover:text-slate-300">
            ← Events
          </Link>
          <h2 className="mt-1 text-xl font-semibold text-white">{event.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">{event.description}</p>
          <div className="mt-3 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
            <span>Start: {formatDateTime(event.startTime)}</span>
            <span>End: {formatDateTime(event.endTime)}</span>
            <span>Location: {event.location || '—'}</span>
            <span>
              Registered: {event.registeredUserCount} · Sessions: {event.sessionCount}
            </span>
          </div>
        </div>
      </div>

      {/* ── QR / manual registration ── */}
      <QrRegistrationPanel eventId={eventId} onSuccess={load} />

      {/* ── Remove user (by dropdown) ── */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-sm font-medium text-white">Remove user from event</p>
        <form onSubmit={removeUser} className="mt-3 flex flex-wrap items-end gap-2">
          <select
            value={removeUserId}
            onChange={(e) => setRemoveUserId(e.target.value)}
            className="min-w-[200px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            <option value="">Select user to remove…</option>
            {users.map((u) => (
              <option key={u.id} value={String(u.id)}>
                #{u.id} — {u.name} ({u.email})
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!removeUserId}
            className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-200 disabled:opacity-50"
          >
            Remove from event
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-600">
          Note: the backend does not expose a registered-user list, so this dropdown shows all users.
          See the <Link to="/users" className="text-slate-400 underline">Users page</Link> for IDs.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <p className="text-sm font-medium text-white">New session</p>
        <form onSubmit={createSession} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            placeholder="Title"
            value={sessionForm.title}
            onChange={(e) => setSessionForm((p) => ({ ...p, title: e.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white sm:col-span-2"
            required
          />
          <textarea
            placeholder="Description"
            value={sessionForm.description}
            onChange={(e) => setSessionForm((p) => ({ ...p, description: e.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white sm:col-span-2"
            rows={2}
          />
          <input
            placeholder="Speaker"
            value={sessionForm.speaker}
            onChange={(e) => setSessionForm((p) => ({ ...p, speaker: e.target.value }))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white sm:col-span-2"
          />
          <label className="text-xs text-slate-500">
            Start
            <input
              type="datetime-local"
              value={sessionForm.startLocal}
              onChange={(e) => setSessionForm((p) => ({ ...p, startLocal: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              required
            />
          </label>
          <label className="text-xs text-slate-500">
            End
            <input
              type="datetime-local"
              value={sessionForm.endLocal}
              onChange={(e) => setSessionForm((p) => ({ ...p, endLocal: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              required
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={savingSession}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-60"
            >
              {savingSession ? 'Creating...' : 'Create session'}
            </button>
          </div>
        </form>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-white">Sessions</h3>
        {!sessions.length ? (
          <EmptyState message="No sessions for this event." />
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/sessions/${s.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 hover:border-slate-600"
                >
                  <div>
                    <p className="font-medium text-white">{s.title}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(s.startTime)}</p>
                  </div>
                  <span className="text-xs text-slate-600">
                    {s.active ? 'Active' : 'Inactive'} · Attendance {s.attendanceEnabled ? 'on' : 'off'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
