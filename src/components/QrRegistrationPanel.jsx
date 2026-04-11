import { useCallback, useEffect, useRef, useState } from 'react'
import { eventsService } from '@/features/events/eventsService'

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse a raw QR / manual-input string into a numeric user ID.
 * Accepts: "USER:42", "user:42", or plain "42".
 * Returns null for anything malformed.
 */
function parseUserQr(raw) {
  const s = raw.trim()
  if (!s) return null
  const prefixed = s.match(/^USER:(\d+)$/i)
  if (prefixed) return parseInt(prefixed[1], 10)
  const plain = s.match(/^\d+$/)
  if (plain) return parseInt(s, 10)
  return null
}

const SCANNER_SUPPORTED =
  typeof navigator !== 'undefined' &&
  !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

// How long (ms) to ignore the same QR value after a successful scan.
// Prevents re-registering the same person if they linger in frame.
const SAME_QR_COOLDOWN = 8000

// ── main component ────────────────────────────────────────────────────────────

/**
 * QrRegistrationPanel
 *
 * Continuous QR registration widget. When the scanner is open it stays active
 * and automatically processes each detected QR code. After a successful scan the
 * camera keeps running so the next participant can be scanned immediately with no
 * extra clicks.
 *
 * Props:
 *   eventId   — the current event id
 *   onSuccess — optional callback(userId) after a successful registration
 */
export function QrRegistrationPanel({ eventId, onSuccess }) {
  const [manualInput, setManualInput] = useState('')
  const [parseError, setParseError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [recentResults, setRecentResults] = useState([]) // [{ userId, ok, msg, ts }]
  const [busy, setBusy] = useState(false)
  const [processingQr, setProcessingQr] = useState(false) // overlay while registering via camera

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  // Track recently scanned values to debounce duplicate scans
  const lastScannedRef = useRef({ value: null, at: 0 })
  // Keep a stable ref to busy so the scan loop can read it without stale closure
  const busyRef = useRef(false)
  useEffect(() => { busyRef.current = busy }, [busy])

  // ── registration call ─────────────────────────────────────────────────────

  const register = useCallback(
    async (userId, { fromScanner = false } = {}) => {
      if (busyRef.current) return
      setBusy(true)
      if (fromScanner) setProcessingQr(true)
      try {
        await eventsService.registerUser(eventId, userId)
        const entry = { userId, ok: true, msg: `✓ User ${userId} registered`, ts: Date.now() }
        setRecentResults((prev) => [entry, ...prev].slice(0, 8))
        onSuccess?.(userId)
      } catch (err) {
        const status = err?.response?.status
        const serverMsg = err?.response?.data?.message || err?.response?.data || ''
        const msg =
          status === 409
            ? `User ${userId} already registered`
            : status === 404
              ? `User ${userId} not found`
              : `Registration failed${serverMsg ? ': ' + serverMsg : ''}`
        setRecentResults((prev) => [{ userId, ok: false, msg, ts: Date.now() }, ...prev].slice(0, 8))
      } finally {
        setBusy(false)
        if (fromScanner) setProcessingQr(false)
      }
    },
    [eventId, onSuccess],
  )

  // ── manual submit ─────────────────────────────────────────────────────────

  const handleManualSubmit = (e) => {
    e.preventDefault()
    setParseError('')
    const userId = parseUserQr(manualInput)
    if (!userId) {
      setParseError('Enter USER:<id> or a plain numeric ID')
      return
    }
    setManualInput('')
    register(userId)
  }

  // ── scanner lifecycle ─────────────────────────────────────────────────────

  const stopScanner = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setScanning(false)
    setProcessingQr(false)
    setScanError('')
  }, [])

  const startScanner = useCallback(async () => {
    setScanError('')

    if (!SCANNER_SUPPORTED) {
      setScanError('Camera not available in this browser. Use manual input instead.')
      return
    }

    if (typeof window.jsQR !== 'function') {
      setScanError('QR library failed to load. Check your network or use manual input.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      setScanning(true)
    } catch {
      setScanError('Camera permission denied. Use manual input instead.')
    }
  }, [])

  // Attach stream → video, run continuous decode loop while scanning=true
  useEffect(() => {
    if (!scanning || !videoRef.current || !streamRef.current) return

    const video = videoRef.current
    video.srcObject = streamRef.current
    video.play().catch(() => {})

    const scanLoop = () => {
      if (!scanning) return

      const canvas = canvasRef.current
      if (!canvas) {
        rafRef.current = requestAnimationFrame(scanLoop)
        return
      }

      if (video.readyState >= 2) {
        const ctx = canvas.getContext('2d')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })

        if (code && code.data && !busyRef.current) {
          const userId = parseUserQr(code.data)
          if (userId) {
            const now = Date.now()
            const last = lastScannedRef.current
            // Skip if this exact QR was processed recently (cooldown window)
            const isDuplicate =
              last.value === code.data && now - last.at < SAME_QR_COOLDOWN

            if (!isDuplicate) {
              lastScannedRef.current = { value: code.data, at: now }
              // Camera stays ON — do NOT call stopScanner here
              register(userId, { fromScanner: true })
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(scanLoop)
    }

    rafRef.current = requestAnimationFrame(scanLoop)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [scanning, register])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopScanner()
  }, [stopScanner])

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white">Register participant to event</p>
        {scanning && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Camera active
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Scan a user QR code — camera stays open for continuous check-in. Or enter{' '}
        <code className="text-slate-400">USER:&lt;id&gt;</code> manually (e.g.{' '}
        <code className="text-slate-400">USER:42</code> or <code className="text-slate-400">42</code>).
      </p>

      {/* Manual input row */}
      <form onSubmit={handleManualSubmit} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[180px]">
          <input
            type="text"
            placeholder="USER:42 or 42"
            value={manualInput}
            onChange={(e) => {
              setManualInput(e.target.value)
              setParseError('')
            }}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-500"
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
            📷 Start scanning
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

      {/* Scanner error / permission message */}
      {scanError && (
        <p className="text-xs text-amber-400 rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2">
          {scanError}
        </p>
      )}

      {/* Live video feed — stays visible while scanning=true */}
      {scanning && (
        <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-black aspect-video max-h-72">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />

          {/* Targeting frame */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className={`w-44 h-44 rounded-lg border-2 transition-colors duration-200 ${
                processingQr ? 'border-emerald-400' : 'border-white/50'
              }`}
            />
          </div>

          {/* Processing overlay */}
          {processingQr && (
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-950/60 pointer-events-none">
              <p className="text-sm font-semibold text-emerald-300">Registering…</p>
            </div>
          )}

          <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/60 select-none">
            {processingQr ? 'Processing scan…' : 'Point at participant QR — camera stays open'}
          </p>
        </div>
      )}

      {/* Hidden canvas for jsQR frame decoding */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Recent registrations feed */}
      {recentResults.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-slate-600 font-medium uppercase tracking-wide">
            Recent registrations
          </p>
          {recentResults.map((r) => (
            <div
              key={r.ts}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                r.ok
                  ? 'border border-emerald-900/50 bg-emerald-950/40 text-emerald-300'
                  : 'border border-red-900/50 bg-red-950/40 text-red-300'
              }`}
            >
              <span>{r.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
