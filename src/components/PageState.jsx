export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-300">{message}</div>
  )
}

export function EmptyState({ message = 'No data found.' }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 text-sm text-slate-600">{message}</div>
  )
}

export function ErrorState({ message = 'Something went wrong.' }) {
  return (
    <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-300">{message}</div>
  )
}
