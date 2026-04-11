import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { eventsService } from '@/features/events/eventsService'
import { formatDateTime, localInputToIso } from '@/utils/formatters'
import { EmptyState, ErrorState, LoadingState } from '@/components/PageState'
import { useToast } from '@/hooks/useToast'
import { useAuthStore } from '@/store/authStore'

const emptyCreate = {
  title: '',
  description: '',
  location: '',
  pictureOfEventUrl: '',
  startLocal: '',
  endLocal: '',
}

export function EventsPage() {
  const toast = useToast()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'Admin'
  const isRegistrar = user?.role === 'Registrar'

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setEvents(await eventsService.list())
    } catch {
      setError('Failed to load events.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onCreate = async (e) => {
    e.preventDefault()
    const startTime = localInputToIso(createForm.startLocal)
    const endTime = localInputToIso(createForm.endLocal)
    if (!startTime || !endTime) {
      toast.show('Please set start and end date/time.', 'error')
      return
    }
    setSaving(true)
    try {
      await eventsService.create({
        title: createForm.title,
        description: createForm.description || undefined,
        location: createForm.location || undefined,
        pictureOfEventUrl: createForm.pictureOfEventUrl || undefined,
        startTime,
        endTime,
      })
      toast.show('Event created')
      setCreateForm(emptyCreate)
      setShowCreate(false)
      load()
    } catch {
      toast.show('Could not create event.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState message="Loading events..." />
  if (error) return <ErrorState message={error} />

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-white">Events</h2>

        {/* Create button — Admin only */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900"
          >
            New event
          </button>
        )}
      </div>

      {/* ── Create event form — Admin only ── */}
      {isAdmin && showCreate && (
        <form
          onSubmit={onCreate}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
        >
          <p className="text-sm font-medium text-white">Create event</p>
          <input
            placeholder="Title"
            value={createForm.title}
            onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            required
          />
          <textarea
            placeholder="Description"
            value={createForm.description}
            onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            rows={2}
          />
          <input
            placeholder="Location"
            value={createForm.location}
            onChange={(e) => setCreateForm((p) => ({ ...p, location: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <input
            placeholder="Picture URL"
            value={createForm.pictureOfEventUrl}
            onChange={(e) => setCreateForm((p) => ({ ...p, pictureOfEventUrl: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-500">
              Start
              <input
                type="datetime-local"
                value={createForm.startLocal}
                onChange={(e) => setCreateForm((p) => ({ ...p, startLocal: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                required
              />
            </label>
            <label className="text-xs text-slate-500">
              End
              <input
                type="datetime-local"
                value={createForm.endLocal}
                onChange={(e) => setCreateForm((p) => ({ ...p, endLocal: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                required
              />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!events.length ? (
        <EmptyState message="No events yet." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
            >
              <h3 className="font-semibold text-white">{ev.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">{ev.description}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
                <span>{formatDateTime(ev.startTime)}</span>
                <span>
                  Sessions: {ev.sessionCount} · Registered: {ev.registeredUserCount}
                </span>
              </div>

              {/* Role-aware action links */}
              <div className="mt-3 flex flex-wrap gap-2">
                {isAdmin && (
                  <Link
                    to={`/events/${ev.id}`}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Manage event
                  </Link>
                )}
                {/* Desk link shown to Registrar always, and to Admin as a secondary action */}
                <Link
                  to={`/events/${ev.id}/desk`}
                  className={
                    isRegistrar
                      ? 'rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-900'
                      : 'rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800'
                  }
                >
                  Registration desk →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
