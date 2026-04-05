# HUPT Admin (web)

Separate Vite + React admin app for the Spring Boot backend. Uses the same stack as `hupt_frontend_web` but targets **Admin-only** API operations.

## Stack

- Vite + React (JavaScript)
- React Router
- Axios + Zustand
- Tailwind CSS

## Setup

```bash
cd hupt_frontend_web_admin
cp .env.example .env
npm install
npm run dev
```

Default dev server port: **5176** (see `vite.config.js`). Add this origin to backend CORS (e.g. `http://localhost:5176`).

## Auth

- JWT stored under `localStorage` key `hupt_admin_access_token` (separate from the public app’s key).
- Only users with role **Admin** can use the shell; others are redirected to `/access-denied`.
- Non-admin login attempts do not persist a token.

## Admin features wired to backend

| Area | Endpoints |
|------|-----------|
| Events | `POST /api/events`, `GET /api/events`, `GET /api/events/{id}`, `POST/DELETE .../register/{userId}`, `GET /api/events/me/created` (metrics) |
| Sessions | `POST /api/sessions/event/{eventId}`, `GET ...`, `PATCH` activate/deactivate, attendance enable/disable, QR regenerate |
| Users | `GET /api/users`, `GET /api/users/{id}` (detail available via service; list used in UI) |
| Questions | `GET /api/questions/session/{sessionId}`, `PATCH /api/questions/{id}/approve` |
| Resources | `GET /api/resources/session/{sessionId}`, `POST /api/resources/session/{sessionId}` |
| Attendance | `GET /api/attendance/session/{sessionId}`, `GET .../count` |

**Note:** `SessionResponseDto` does not expose `qrKey`; the UI documents that regenerate still updates the server key for attendance.

## Firebase push notifications (backend-driven)

There is **no** admin API to “send a notification” manually from this UI. On the backend ([backend_hupt_app](https://github.com/mavniselimi/backend_hupt_app)), **`PATCH /api/sessions/{id}/activate`** runs `SessionService.activateSession`, which calls Firebase to notify **event-registered users** who have stored FCM device tokens (`POST /api/device-tokens` from the iOS/Android apps).

- **Admin’s job here:** use **Activate** on the session detail page. The UI explains that this step triggers push (when Firebase is configured server-side and users have registered tokens).
- **iOS app:** registers the FCM token after login so users actually receive the push.

## Build

```bash
npm run build
npm run preview
```
