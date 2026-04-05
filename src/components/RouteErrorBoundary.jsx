import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

export function RouteErrorBoundary() {
  const error = useRouteError()
  let message = 'Unexpected error while rendering page.'
  if (isRouteErrorResponse(error)) {
    message = `${error.status} ${error.statusText}`
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-400">{message}</p>
        <Link to="/" className="mt-4 inline-block rounded-lg bg-white px-3 py-2 text-sm text-slate-900">
          Go home
        </Link>
      </div>
    </div>
  )
}
