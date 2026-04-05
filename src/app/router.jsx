import { createBrowserRouter } from 'react-router-dom'
import { AdminProtectedRoute } from '@/components/AdminProtectedRoute'
import { AdminShell } from '@/layouts/AdminShell'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { EventsPage } from '@/pages/EventsPage'
import { EventDetailPage } from '@/pages/EventDetailPage'
import { SessionDetailPage } from '@/pages/SessionDetailPage'
import { UsersPage } from '@/pages/UsersPage'
import { AccessDeniedPage } from '@/pages/AccessDeniedPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorBoundary /> },
  { path: '/access-denied', element: <AccessDeniedPage />, errorElement: <RouteErrorBoundary /> },
  {
    path: '/',
    element: (
      <AdminProtectedRoute>
        <AdminShell />
      </AdminProtectedRoute>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'events', element: <EventsPage /> },
      { path: 'events/:eventId', element: <EventDetailPage /> },
      { path: 'sessions/:sessionId', element: <SessionDetailPage /> },
      { path: 'users', element: <UsersPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage />, errorElement: <RouteErrorBoundary /> },
])
