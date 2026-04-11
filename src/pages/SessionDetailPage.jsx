import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { sessionsService } from '@/features/sessions/sessionsService'
import { questionsService } from '@/features/questions/questionsService'
import { resourcesService } from '@/features/resources/resourcesService'
import { attendanceService } from '@/features/attendance/attendanceService'
import { formatDateTime, localInputToIso } from '@/utils/formatters'
import { EmptyState, ErrorState, LoadingState } from '@/components/PageState'
import { useToast } from '@/hooks/useToast'
import { useAuthStore } from '@/store/authStore'

// ── QR code display component (uses qrcodejs loaded via CDN in index.html) ────

function SessionQrDisplay({ sessionId, onRegenerate }) {
  const [detail, setDetail] = useState(null)
  const [loadingQr, setLoadingQr] = useState(true)
  const [qrError, setQrError] = useState('')
  const containerRef = useRef(null)
  const qrInstanceRef = useRef(null)

  const fetchDetail = useCallback(async () => {
    setLoadingQr(true)
    setQrError('')
    try {
      const d = await sessionsService.adminDetail(sessionId)
      setDetail(d)
    } catch {
      setQrError('Could not load QR key.')
    } finally {
      setLoadingQr(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  // Render QR code whenever qrKey changes
  useEffect(() => {
    if (!detail?.qrKey || !containerRef.current) return

    // Clear previous QR instance
    if (qrInstanceRef.current) {
      containerRef.current.innerHTML = ''
      qrInstanceRef.current = null
    }

    if (typeof window.QRCode !== 'function') {
      setQrError('QR library not loaded. Reload the page.')
      return
    }

    try {
      qrInstanceRef.current = new window.QRCode(containerRef.current, {
        text: detail.qrKey,
        width: 220,
        height: 220,
        colorDark: '#ffffff',
        colorLight: '#0f172a', // slate-950
        correctLevel: window.QRCode.CorrectLevel.M,
      })
    } catch {
      setQrError('QR render failed.')
    }
  }, [detail?.qrKey])

  const handleRegenerate = async () => {
    await onRegenerate()
    // Refresh the detail (new qrKey after regeneration)
    await fetchDetail()
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium text-white">Session QR Code</h3>
        <button
          type="button"
          onClick={handleRegenerate}
          className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-1.5 text-xs text-amber-200 hover:bg-amber-950/50"
        >
          Regenerate QR
        </button>
      </div>

      {loadingQr && (
        <p className="text-xs text-slate-500">Loading QR code…</p>
      )}

      {qrError && (
        <p className="text-xs text-red-400">{qrError}</p>
      )}

      {!loadingQr && !qrError && detail?.qrKey && (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          {/* QR code canvas rendered by qrcodejs */}
          <div
            ref={containerRef}
            className="rounded-lg overflow-hidden border border-slate-700 bg-slate-950 p-2"
          />
          <div className="space-y-1">
            <p className="text-xs text-slate-500">
              Show this QR code to participants for attendance check-in.
            </p>
            <p className="text-xs text-slate-600">
              Key:{' '}
              <code className="break-all text-slate-400">{detail.qrKey}</code>
            </p>
            {detail.attendanceEnabled ? (
              <span className="inline-block rounded bg-emerald-950/60 px-2 py-0.5 text-xs text-emerald-300">
                Attendance enabled
              </span>
            ) : (
              <span className="inline-block rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-500">
                Attendance disabled — enable it above
              </span>
            )}
          </div>
        </div>
      )}

      {!loadingQr && !qrError && !detail?.qrKey && (
        <p className="text-xs text-slate-500">No QR key assigned. Regenerate to create one.</p>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SessionDetailPage() {
  const { sessionId } = useParams()
  const toast = useToast()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'Admin'
  const isRegistrar = user?.role === 'Registrar'
  const canManage = isAdmin || isRegistrar

  const [session, setSession] = useState(null)
  const [questions, setQuestions] = useState([])
  const [resources, setResources] = useState([])
  const [attendance, setAttendance] = useState([])
  const [attCount, setAttCount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resourceForm, setResourceForm] = useState({
    fileName: '',
    fileUrl: '',
    type: '',
    createdAtLocal: '',
  })

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [s, q, r, a, c] = await Promise.all([
        sessionsService.detail(sessionId),
        questionsService.bySession(sessionId),
        resourcesService.bySession(sessionId),
        attendanceService.bySession(sessionId),
        attendanceService.countBySession(sessionId),
      ])
      setSession(s)
      setQuestions(q)
      setResources(r)
      setAttendance(a)
      setAttCount(c)
    } catch {
      setError('Failed to load session.')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const run = async (fn, okMsg) => {
    try {
      await fn()
      toast.show(okMsg)
      await loadAll()
    } catch {
      toast.show('Action failed.', 'error')
    }
  }

  const approve = async (questionId) => {
    try {
      await questionsService.approve(questionId)
      toast.show('Question approved')
      loadAll()
    } catch {
      toast.show('Approve failed.', 'error')
    }
  }

  const addResource = async (e) => {
    e.preventDefault()
    const createdAt = resourceForm.createdAtLocal
      ? localInputToIso(resourceForm.createdAtLocal)
      : undefined
    try {
      await resourcesService.addToSession(sessionId, {
        fileName: resourceForm.fileName,
        fileUrl: resourceForm.fileUrl,
        type: resourceForm.type,
        ...(createdAt ? { createdAt } : {}),
      })
      toast.show('Resource added')
      setResourceForm({ fileName: '', fileUrl: '', type: '', createdAtLocal: '' })
      loadAll()
    } catch {
      toast.show('Could not add resource.', 'error')
    }
  }

  if (loading) return <LoadingState message="Loading session..." />
  if (error) return <ErrorState message={error} />
  if (!session) return <EmptyState message="Session not found." />

  const backToEvent = session.eventId ? `/events/${session.eventId}` : '/events'

  return (
    <section className="space-y-6">
      <div>
        <Link to={backToEvent} className="text-xs text-slate-500 hover:text-slate-300">
          ← Event
        </Link>
        <h2 className="mt-1 text-xl font-semibold text-white">{session.title}</h2>
        <p className="mt-2 text-sm text-slate-400">{session.description}</p>
        <div className="mt-3 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
          <span>Speaker: {session.speaker || '—'}</span>
          <span>
            {session.active ? 'Active' : 'Inactive'} · Attendance{' '}
            {session.attendanceEnabled ? 'enabled' : 'disabled'}
          </span>
          <span>Start: {formatDateTime(session.startTime)}</span>
          <span>End: {formatDateTime(session.endTime)}</span>
          <span>
            Counts: Q {session.questionCount} · R {session.resourceCount} · A{' '}
            {session.attendanceCount}
          </span>
          {attCount != null && <span>Attendance count (live): {attCount.count}</span>}
        </div>
        {isAdmin && (
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-400">
            <p className="font-medium text-slate-300">Firebase push (automatic)</p>
            <p className="mt-1">
              When you <strong className="text-slate-200">Activate</strong> this session, the backend
              notifies users registered for this event who have an FCM device token (iPhone app).
              Activation triggers the push — no separate button needed.
            </p>
          </div>
        )}
      </div>

      {/* ── Session QR Code display (Admin + Registrar) ── */}
      {canManage && (
        <SessionQrDisplay
          sessionId={sessionId}
          onRegenerate={() => sessionsService.regenerateQr(sessionId)}
        />
      )}

      {/* ── Session management actions (Admin only) ── */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              run(
                () => sessionsService.activate(sessionId),
                'Session activated — push sent to registered users with device tokens.',
              )
            }
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Activate
          </button>
          <button
            type="button"
            onClick={() => run(() => sessionsService.deactivate(sessionId), 'Session deactivated')}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Deactivate
          </button>
          <button
            type="button"
            onClick={() =>
              run(() => sessionsService.enableAttendance(sessionId), 'Attendance enabled')
            }
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Enable attendance
          </button>
          <button
            type="button"
            onClick={() =>
              run(() => sessionsService.disableAttendance(sessionId), 'Attendance disabled')
            }
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Disable attendance
          </button>
        </div>
      )}

      {/* Registrar can enable/disable attendance for their desk */}
      {isRegistrar && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              run(() => sessionsService.enableAttendance(sessionId), 'Attendance enabled')
            }
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Enable attendance
          </button>
          <button
            type="button"
            onClick={() =>
              run(() => sessionsService.disableAttendance(sessionId), 'Attendance disabled')
            }
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Disable attendance
          </button>
        </div>
      )}

      {/* ── Questions (Admin only — moderation) ── */}
      {isAdmin && (
        <div>
          <h3 className="mb-2 font-medium text-white">Questions (moderation)</h3>
          {!questions.length ? (
            <EmptyState message="No questions." />
          ) : (
            <ul className="space-y-2">
              {questions.map((q) => (
                <li
                  key={q.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                >
                  <div>
                    <p className="text-sm text-slate-200">{q.content}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {q.approved ? 'Approved' : 'Pending'} ·{' '}
                      {q.anonymous ? 'Anonymous' : q.askedByName || 'Named'}
                      {q.createdAt ? ` · ${formatDateTime(q.createdAt)}` : ''}
                    </p>
                  </div>
                  {!q.approved && (
                    <button
                      type="button"
                      onClick={() => approve(q.id)}
                      className="shrink-0 rounded bg-white px-2 py-1 text-xs font-medium text-slate-900"
                    >
                      Approve
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Resources (Admin only) ── */}
      {isAdmin && (
        <div>
          <h3 className="mb-2 font-medium text-white">Resources</h3>
          <form
            onSubmit={addResource}
            className="mb-3 grid gap-2 rounded-xl border border-slate-800 bg-slate-900/40 p-3 sm:grid-cols-2"
          >
            <input
              placeholder="File name"
              value={resourceForm.fileName}
              onChange={(e) => setResourceForm((p) => ({ ...p, fileName: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              required
            />
            <input
              placeholder="File URL"
              value={resourceForm.fileUrl}
              onChange={(e) => setResourceForm((p) => ({ ...p, fileUrl: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              required
            />
            <input
              placeholder="Type (e.g. PDF)"
              value={resourceForm.type}
              onChange={(e) => setResourceForm((p) => ({ ...p, type: e.target.value }))}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              required
            />
            <label className="text-xs text-slate-500">
              File date (optional)
              <input
                type="datetime-local"
                value={resourceForm.createdAtLocal}
                onChange={(e) =>
                  setResourceForm((p) => ({ ...p, createdAtLocal: e.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900"
              >
                Add resource
              </button>
            </div>
          </form>
          {!resources.length ? (
            <EmptyState message="No resources." />
          ) : (
            <ul className="space-y-2">
              {resources.map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-800 px-3 py-2 text-sm">
                  <a
                    href={r.fileUrl}
                    className="text-slate-200 underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {r.fileName}
                  </a>
                  <span className="ml-2 text-xs text-slate-600">{r.type}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Attendance list (Admin + Registrar) ── */}
      <div>
        <h3 className="mb-2 font-medium text-white">Attendance</h3>
        {!attendance.length ? (
          <EmptyState message="No attendance records." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-slate-900 text-slate-500">
                <tr>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((row) => (
                  <tr key={row.id} className="border-b border-slate-800/80">
                    <td className="px-3 py-2 text-slate-300">{row.userName}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {formatDateTime(row.attendedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
