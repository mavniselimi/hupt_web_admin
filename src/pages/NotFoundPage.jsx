import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
        <p className="text-sm text-slate-500">Page not found</p>
        <Link to="/" className="mt-3 inline-block rounded-lg bg-white px-3 py-2 text-sm text-slate-900">
          Dashboard
        </Link>
      </div>
    </div>
  )
}
