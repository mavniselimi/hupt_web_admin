import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { eventsService } from '@/features/events/eventsService'
import { QrRegistrationPanel } from '@/components/QrRegistrationPanel'
import { ErrorState, LoadingState } from '@/components/PageState'
import { formatDateTime } from '@/utils/formatters'

/**
 * DeskPage — /events/:eventId/desk
 *
 * Registration desk workflow for Registrar (and Admin) users.
 * This page intentionally only fetches event detail — no admin-only
 * calls (no /api/users, no session management, etc.).
 *
 * The QrRegistrationPanel handles:
 *   - Continuous camera-based QR scanning
 *   - Manual USER:<id> input fallback
 *   - POST /api/events/:id/registrations/users/:userId
 *   - Recent registration results feed
 */
export function DeskPage() {
  const { eventId } = useParams()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadEvent = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const ev = await eventsService.detail(eventId)
      setEvent(ev)
    } catch (err) {
      const status = err?.response?.status
      if (status === 404) {
        setError('Event not found.')
      } else {
        setError('Could not load event.')
      }
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    loadEvent()
  }, [loadEvent])

  if (loading) return <LoadingState message="Loading event…" />
  if (error) return <ErrorState message={error} />

  return (
    <section className="space-y-6">
      {/* ── Header ── */}
      <div>
        <Link to="/events" className="text-xs text-slate-500 hover:text-slate-300">
          ← Events
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">{event.title}</h2>
            <p className="mt-1 text-xs text-slate-500">
              Registration desk
            </p>
          </div>

          {/* Timestamps as subtle context */}
          <div className="text-right text-xs text-slate-600">
            <p>{formatDateTime(event.startTime)}</p>
            <p>{formatDateTime(event.endTime)}</p>
          </div>
        </div>

        {event.location && (
          <p className="mt-1 text-xs text-slate-600">{event.location}</p>
        )}
      </div>

      {/* ── Status summary ── */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span>
          Registered participants:{' '}
          <span className="font-medium text-slate-300">{event.registeredUserCount ?? '—'}</span>
        </span>
        <span>
          Sessions:{' '}
          <span className="font-medium text-slate-300">{event.sessionCount ?? '—'}</span>
        </span>
      </div>

      {/* ── QR registration panel ── */}
      <QrRegistrationPanel eventId={eventId} />
    </section>
  )
}
