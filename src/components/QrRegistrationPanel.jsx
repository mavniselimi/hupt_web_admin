import { useCallback, useEffect, useRef, useState } from 'react'
import { eventsService } from '@/features/events/eventsService'

// ── helpers ──────────────────────────────────────────────────────────────────

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
  typeof window !== 'undefined' && 'BarcodeDetector' in window

// ── main component ────────────────────────────────────────────────────────────

/**
 * QrRegistrationPanel
 *
 * Renders a compact registration widget for an event. Supports:
 *   1. Manual text entry (USER:<id> or plain numeric id)
 *   2. QR scanner via native BarcodeDetector + getUserMedia (Chrome/Edge 88+)
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

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const detectorRef = useRef(null)
  const lastScanRef = useRef(0) // debounce repeated scans of same frame

  // ── registration call ──────────────────────────────────────────────────────

  const register = useCallback(
    async (userId) => {
      if (busy) return
      setBusy(true)
      try {
        await eventsService.registerUser(eventId, userId)
        const entry = { userId, ok: true, msg: `User ${userId} registered`, ts: Date.now() }
        setRecentResults((prev) => [entry, ...prev].slice(0, 6))
        onSuccess?.(userId)
      } catch (err) {
        const status = err?.response?.status
        const serverMsg = err?.response?.data?.message || err?.response?.data || ''
        const msg =
          status === 409
            ? `User ${userId} is already registered`
            : status === 404
              ? `User ${userId} not found`
              : `Registration failed${serverMsg ? ': ' + serverMsg : ''}`
        setRecentResults((prev) => [{ userId, ok: false, msg, ts: Date.now() }, ...prev].slice(0, 6))
      } finally {
        setBusy(false)
      }
    },
    [eventId, busy, onSuccess],
  )

  // ── manual submit ──────────────────────────────────────────────────────────

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

  // ── scanner lifecycle ──────────────────────────────────────────────────────

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
    setScanError('')
  }, [])

  const startScanner = useCallback(async () => {
    setScanError('')
    if (!SCANNER_SUPPORTED) {
      setScanError('QR scanner not available in this browser (requires Chrome 88+ / Edge 88+). Use manual input instead.')
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

  // Attach stream to video element once scanning becomes true
  useEffect(() => {
    if (!scanning || !videoRef.current || !streamRef.current) return
    const video = videoRef.current
    video.srcObject = streamRef.current
    video.play().catch(() => {})

    if (!detectorRef.current) {
      detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] })
    }
    const detector = detectorRef.current

    const scanLoop = async () => {
      if (!scanning) return
      if (video.readyState >= 2) {
        const now = Date.now()
        if (now - lastScanRef.current > 800) {
          try {
            const codes = await detector.detect(video)
            if (codes.length > 0) {
              const raw = codes[0].rawValue
              const userId = parseUserQr(raw)
              if (userId) {
                lastScanRef.current = now
                // brief visual pause then register
                stopScanner()
                register(userId)
                return
              }
            }
          } catch {
            // detector errors are non-fatal — keep looping
          }
        }
      }
      rafRef.current = requestAnimationFrame(scanLoop)
    }

    rafRef.current = requestAnimationFrame(scanLoop)

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [scanning, register, stopScanner])

  // Cleanup on unmount
  useEffect(() => {
    return () => stopScanner()
  }, [stopScanner])

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
      <p className="text-sm font-medium text-white">Register user to event</p>
      <p className="text-xs text-slate-500">
        Scan a user QR code or enter <code className="text-slate-400">USER:&lt;id&gt;</code> manually (e.g.{' '}
        <code className="text-slate-400">USER:42</code> or just <code className="text-slate-400">42</code>).
      </p>

      {/* Manual input */}
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
          />
          {parseError && <p className="mt-1 text-xs text-red-400">{parseError}</p>}
        </div>
        <button
          type="submit"
          disabled={busy || !manualInput.trim()}
          className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
        >
          {busy ? 'Registering…' : 'Register'}
        </button>
        {SCANNER_SUPPORTED && !scanning && (
          <button
            type="button"
            onClick={startScanner}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            📷 Scan QR
          </button>
        )}
        {scanning && (
          <button
            type="button"
            onClick={stopScanner}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 hover:bg-slate-800"
          >
            ✕ Cancel scan
          </button>
        )}
      </form>

      {/* Scanner error message */}
      {scanError && (
        <p className="text-xs text-amber-400 rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2">
          {scanError}
        </p>
      )}

      {/* Video scanner */}
      {scanning && (
        <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-black aspect-video max-h-64">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 border-2 border-white/50 rounded-lg" />
          </div>
          <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/60">
            Point camera at user QR code
          </div>
        </div>
      )}

      {/* Recent results */}
      {recentResults.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-slate-600 font-medium">Recent registrations</p>
          {recentResults.map((r) => (
            <div
              key={r.ts}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                r.ok
                  ? 'border border-emerald-900/50 bg-emerald-950/40 text-emerald-300'
                  : 'border border-red-900/50 bg-red-950/40 text-red-300'
              }`}
            >
              <span>{r.ok ? '✓' : '✗'}</span>
              <span>{r.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
