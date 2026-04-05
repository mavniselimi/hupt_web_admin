export function formatDateTime(isoValue) {
  if (!isoValue) return '-'
  return new Date(isoValue).toLocaleString()
}

/** Convert datetime-local value to ISO string for API */
export function localInputToIso(localValue) {
  if (!localValue) return null
  const d = new Date(localValue)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
