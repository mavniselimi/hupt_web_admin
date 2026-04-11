import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { eventsService } from '@/features/events/eventsService'
import { registrationsService } from '@/features/registrations/registrationsService'
import { useAuthStore } from '@/store/authStore'
import { EmptyState, ErrorState, LoadingState } from '@/components/PageState'
import { formatDateTime } from '@/utils/formatters'

// ─── QR parsing ──────────────────────────────────────────────────────────────
// Accepts: "USER:42", "user:42", or plain "42"
function parseUserQr(raw) {
  const s = (raw || '').trim()
  if (!s) return null
  const prefixed = s.match(/^USER:(\d+)$/i)
  if (prefixed) return parseInt(prefixed[1], 10)
  const plain = s.match(/^\d+$/)
  if (plain) return parseInt(s, 10)
  return null
}

const SCANNER_SUPPORTED =
  typeof navigator !== 'undefined' &&
  !!(navigator.mediaDevices?.getUserMedia)

// After a successful scan, ignore the same QR value for this many ms
const SCAN_COOLDOWN_MS = 8000

// Queue auto-refresh interval (ms) — keeps the desk screen live
const QUEUE_POLL_MS = 15_000

// ─── Activity feed entry ─────────────────────────────────────────────────────
function ActivityEntry({ entry }) {
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
        entry.ok
          ? 'border-emerald-900/50 bg-emerald-950/40 text-emerald-300'
          : 'border-red-900/50 bg-red-950/40 text-red-300'
      }`}
    >
      <span className="mt-0.5 shrink-0 font-bold">{entry.ok ? '✓' : '✗'}</span>
      <span className="leading-snug">{entry.msg}</span>
    </div>
  )
}

// ─── Next-person card ────────────────────────────────────────────────────────
function NextPersonCard({ person, onIssueCard, issuing }) {
  if (!person) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 py-10 text-center">
        <p className="text-sm text-slate-500">Queue is empty</p>
        <p className="mt-1 text-xs text-slate-700">New arrivals will appear here automatically.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-600 bg-slate-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Next up</p>
        <span className="rounded-full border border-slate-700 px-2 py-0.5 font-mono text-xs text-slate-400">
          #{person.queueNumber}
        </span>
      </div>

      <p className="text-lg font-semibold text-white">{person.userName || '—'}</p>
      <p className="mt-0.5 text-sm text-slate-400">{person.userEmail || '—'}</p>

      {person.registeredAt && (
        <p className="mt-2 text-xs text-slate-600">
          Registered at {formatDateTime(person.registeredAt)}
        </p>
      )}

      <button
        type="button"
        onClick={() => onIssueCard(person.id)}
        disabled={issuing}
        className="mt-5 w-full rounded-xl bg-white py-3 text-sm font-semibold text-slate-900 transition-opacity disabled:opacity-50 hover:bg-slate-100"
      >
        {issuing ? 'Issuing…' : '✓ Issue card'}
      </button>
    </div>
  )
}

// ─── Queue list row ──────────────────────────────────────────────────────────
function QueueRow({ person, onIssueCard, issuing }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="shrink-0 font-mono text-xs text-slate-600">#{person.queueNumber}</span>
          <span className="truncate text-sm text-white">{person.userName}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">{person.userEmail}</p>
      </div>
      <button
        type="button"
        onClick={() => onIssueCard(person.id)}
        disabled={issuing}
        className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40"
      >
        {issuing ? '…' : 'Issue card'}
      </button>
    </div>
  )
}

// ─── Registration scanner / manual input ─────────────────────────────────────
function RegistrationPanel({ eventId, onRegistered }) {
  const [manualInput, setManualInput] = useState('')
  const [parseError, setParseError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [busy, setBusy] = useState(false)
  const [processing, setProcessing] = useState(false) // camera overlay

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const lastScannedRef = useRef({ value: null, at: 0 })
  const busyRef = useRef(false)
  useEffect(() => { busyRef.current = busy }, [busy])

  // Register participant by user ID
  const register = useCallback(async (userId, { fromScanner = false } = {}) => {
    if (busyRef.current) return
    setBusy(true)
    if (fromScanner) setProcessing(true)
    try {
      const reg = await registrationsService.registerUser(eventId, userId)
      onRegistered({
        ok: true,
        msg: `✓ ${reg.userName || `User ${userId}`} registered — desk ${reg.assignedRegistrarName || '?'}, queue #${reg.queueNumber}`,
      })
    } catch (err) {
      const status = err?.response?.status
      const serverMsg = err?.response?.data?.message || err?.response?.data || ''
      const msg =
        status === 409
          ? `User ${userId} is already registered for this event`
          : status === 404
            ? `User ${userId} not found`
            : `Registration failed${serverMsg ? ': ' + serverMsg : ''}`
      onRegistered({ ok: false, msg })
    } finally {
      setBusy(false)
      if (fromScanner) setProcessing(false)
    }
  }, [eventId, onRegistered])

  // Manual submit
  const handleManualSubmit = (e) => {
    e.preventDefault()
    setParseError('')
    const userId = parseUserQr(manualInput)
    if (!userId) {
      setParseError('Enter USER:<id> or a plain numeric ID (e.g. 42)')
      return
    }
    setManualInput('')
    register(userId)
  }

  // Scanner lifecycle
  const stopScanner = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null }
    setScanning(false)
    setProcessing(false)
    setScanError('')
  }, [])

  const startScanner = useCallback(async () => {
    setScanError('')
    if (!SCANNER_SUPPORTED) { setScanError('Camera not available. Use manual input.'); return }
    if (typeof window.jsQR !== 'function') { setScanError('QR library not loaded — reload the page.'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setScanning(true)
    } catch {
      setScanError('Camera permission denied. Use manual input.')
    }
  }, [])

  // Attach stream + scan loop
  useEffect(() => {
    if (!scanning || !videoRef.current || !streamRef.current) return
    const video = videoRef.current
    video.srcObject = streamRef.current
    video.play().catch(() => {})

    const loop = () => {
      if (!scanning) return
      const canvas = canvasRef.current
      if (!canvas) { rafRef.current = requestAnimationFrame(loop); return }
      if (video.readyState >= 2) {
        const ctx = canvas.getContext('2d')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })
        if (code?.data && !busyRef.current) {
          const userId = parseUserQr(code.data)
          if (userId) {
            const now = Date.now()
            const last = lastScannedRef.current
            const isDuplicate = last.value === code.data && now - last.at < SCAN_COOLDOWN_MS
            if (!isDuplicate) {
              lastScannedRef.current = { value: code.data, at: now }
              register(userId, { fromScanner: true })
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [scanning, register])

  useEffect(() => () => stopScanner(), [stopScanner])

  return (
    <div className="space-y-3">
      {/* Manual input row */}
      <form onSubmit={handleManualSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[160px]">
          <input
            type="text"
            placeholder="USER:42  or  42"
            value={manualInput}
            onChange={(e) => { setManualInput(e.target.value); setParseError('') }}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-slate-500 focus:outline-none"
            autoComplete="off"
            inputMode="numeric"
          />
          {parseError && <p className="mt-1 text-xs text-red-400">{parseError}</p>}
        </div>

        <button
          type="submit"
          disabled={busy || !manualInput.trim()}
          className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
        >
          {busy && !scanning ? 'Registering…' : 'Register'}
        </button>

        {SCANNER_SUPPORTED && !scanning && (
          <button
            type="button"
            onClick={startScanner}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            📷 Start camera
          </button>
        )}
        {scanning && (
          <button
            type="button"
            onClick={stopScanner}
            className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300 hover:bg-red-950/50"
          >
            ✕ Stop camera
          </button>
        )}
      </form>

      {scanError && (
        <p className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-400">
          {scanError}
        </p>
      )}

      {/* Live camera feed */}
      {scanning && (
        <div className="relative aspect-video max-h-64 overflow-hidden rounded-xl border border-slate-700 bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={`h-40 w-40 rounded-lg border-2 transition-colors ${
                processing ? 'border-emerald-400' : 'border-white/50'
              }`}
            />
          </div>
          {processing && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-emerald-950/60">
              <p className="text-sm font-semibold text-emerald-300">Registering…</p>
            </div>
          )}
          <p className="absolute bottom-2 left-0 right-0 select-none text-center text-xs text-white/60">
            {processing ? 'Processing…' : 'Scan participant identity QR — camera stays open'}
          </p>
        </div>
      )}

      {/* Hidden decode canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {scanning && (
        <p className="flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Camera active — scanning continuously
        </p>
      )}
    </div>
  )
}

// ─── Main DeskPage ────────────────────────────────────────────────────────────

export function DeskPage() {
  const { eventId } = useParams()
  const { user } = useAuthStore()

  const [event, setEvent] = useState(null)
  const [queue, setQueue] = useState([])          // PENDING entries for this desk, ordered
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [queueLoading, setQueueLoading] = useState(false)
  const [issuingId, setIssuingId] = useState(null) // registrationId currently being issued
  const [activity, setActivity] = useState([])     // combined feed of registrations + card issuances

  // ── Load event info (once) ─────────────────────────────────────────────────
  const loadEvent = useCallback(async () => {
    try {
      const ev = await eventsService.detail(eventId)
      setEvent(ev)
    } catch (err) {
      const status = err?.response?.status
      setPageError(status === 404 ? 'Event not found.' : 'Could not load event.')
    }
  }, [eventId])

  // ── Load queue (called on mount, after actions, and by poll) ───────────────
  const loadQueue = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setQueueLoading(true)
    try {
      const q = await registrationsService.getMyQueue(eventId)
      setQueue(q)
    } catch {
      // Queue load failure is non-fatal — keep showing stale data
    } finally {
      if (!silent) setQueueLoading(false)
    }
  }, [eventId])

  // ── Boot ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function boot() {
      setPageLoading(true)
      await Promise.all([loadEvent(), loadQueue()])
      setPageLoading(false)
    }
    boot()
  }, [loadEvent, loadQueue])

  // ── Background queue poll ──────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => loadQueue({ silent: true }), QUEUE_POLL_MS)
    return () => clearInterval(interval)
  }, [loadQueue])

  // ── Issue card ─────────────────────────────────────────────────────────────
  const handleIssueCard = async (registrationId) => {
    if (issuingId) return
    setIssuingId(registrationId)
    try {
      const updated = await registrationsService.issueCard(eventId, registrationId)
      addActivity({
        ok: true,
        msg: `✓ Card issued to ${updated.userName || `registration #${registrationId}`} (queue #${updated.queueNumber})`,
      })
      await loadQueue()
    } catch (err) {
      const serverMsg = err?.response?.data?.message || err?.response?.data || ''
      addActivity({
        ok: false,
        msg: `Card issuance failed${serverMsg ? ': ' + serverMsg : ''}`,
      })
    } finally {
      setIssuingId(null)
    }
  }

  // ── Registration callback from RegistrationPanel ───────────────────────────
  const handleRegistered = useCallback(async (result) => {
    addActivity(result)
    if (result.ok) {
      // Reload queue so the new entry appears
      await loadQueue()
    }
  }, [loadQueue])

  // ── Activity feed helper ───────────────────────────────────────────────────
  function addActivity(entry) {
    setActivity((prev) => [{ ...entry, ts: Date.now() }, ...prev].slice(0, 12))
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const nextPerson = queue[0] ?? null
  const restOfQueue = queue.slice(1)

  // ── Render ─────────────────────────────────────────────────────────────────
  if (pageLoading) return <LoadingState message="Loading desk…" />
  if (pageError) return <ErrorState message={pageError} />

  return (
    <section className="space-y-6">

      {/* ── Page header ── */}
      <div>
        <Link to="/events" className="text-xs text-slate-500 hover:text-slate-300">
          ← Events
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-white">{event?.title ?? '—'}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Registration desk
              {user?.name && (
                <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-slate-400">
                  {user.name}
                </span>
              )}
            </p>
          </div>

          {/* Live pending count + refresh */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">
              Pending:{' '}
              <span className="font-semibold text-white">{queue.length}</span>
            </span>
            <button
              type="button"
              onClick={() => loadQueue()}
              disabled={queueLoading}
              className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 disabled:opacity-40"
            >
              {queueLoading ? '…' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {event?.location && (
          <p className="mt-1 text-xs text-slate-600">{event.location}</p>
        )}
      </div>

      {/* ── Two-column layout on large screens ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* ── LEFT: Queue management ── */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-300">Queue</h3>

          {/* Next person — most prominent element */}
          <NextPersonCard
            person={nextPerson}
            onIssueCard={handleIssueCard}
            issuing={issuingId === nextPerson?.id}
          />

          {/* Rest of the queue */}
          {restOfQueue.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-600">
                Up next ({restOfQueue.length} more)
              </p>
              {restOfQueue.map((person) => (
                <QueueRow
                  key={person.id}
                  person={person}
                  onIssueCard={handleIssueCard}
                  issuing={issuingId === person.id}
                />
              ))}
            </div>
          )}

          {/* Activity feed */}
          {activity.length > 0 && (
            <div className="space-y-1.5 pt-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                Recent activity
              </p>
              {activity.map((a) => (
                <ActivityEntry key={a.ts} entry={a} />
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Register participant ── */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-slate-300">Register participant</h3>
            <p className="mt-1 text-xs text-slate-600">
              Scan the participant's identity QR code, or enter their user ID manually.
              The backend will assign them to the least-loaded desk and add them to a queue.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <RegistrationPanel
              eventId={eventId}
              onRegistered={handleRegistered}
            />
          </div>

          {/* Desk info */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-600 space-y-1">
            <p className="font-medium text-slate-500">How the queue works</p>
            <p>When you register a participant, the backend automatically routes them to the least-loaded active desk for this event.</p>
            <p>Your desk queue shows only participants assigned to you. Use <strong className="text-slate-400">Issue card</strong> once you have handed them their card.</p>
            <p>The queue refreshes automatically every {QUEUE_POLL_MS / 1000} seconds.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
