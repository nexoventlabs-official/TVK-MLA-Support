# Mylapore Citizen Portal

Web-native counterpart to the WhatsApp grievance bot. Same backend, same
collections, same Member identity (keyed by mobile number) — just a different
surface. A user who registers here can later message the bot and be
recognised; a user who registered via the bot can log in here without
re-registering.

## Stack

- React 18 + Vite 5 + Tailwind CSS
- React Router v6 with Auth-context-driven protected routes
- Axios with a shared client + Bearer-token interceptor
- Talks to the Express backend at `${VITE_API_URL}` (or `/api` in dev via the
  Vite proxy)

## Local development

```bash
# Terminal 1 — backend
cd ../backend
npm install         # first time only
node server.js      # http://localhost:5050

# Terminal 2 — portal
cd ../grievance-portal
npm install         # first time only
npm run dev         # http://localhost:1573
```

The dev server proxies `/api/*` to `http://localhost:5050`, so you don't need
to set `VITE_API_URL` locally.

## Authentication

Two-step OTP. Every send uses the same styled UTILITY template so the
recipient gets a consistent branded message with a native one-tap **Copy
code** button regardless of whether they have an active 24-hour WhatsApp
window. The trade-off (paying a tiny per-conversation Utility fee even for
in-window users) is accepted because COPY_CODE buttons are template-only on
WhatsApp Cloud API — free-form messages cannot render them.

Flow:

1. The portal posts `{ phone, mode }` to `POST /api/portal/auth/send-otp`.
2. The backend hashes a 6-digit code into the `OtpCode` collection
   (TTL 5 m, max 5 attempts).
3. The OTP is delivered via the `tvk_portal_otp_styled` UTILITY template.
   If that template doesn't exist on the WABA yet the backend creates it
   itself and retries the send in the same request (auto-heal).
4. The response includes `channel: 'template'`, `messageId` and
   `recipientOnWhatsApp` for diagnostics.
5. The user submits the code; `verify-otp` (login) or `register` (one-shot
   register) returns a 30-day JWT, stored in `localStorage` as
   `tvk_portal_token`.

Sessions are auto-rehydrated on page load by `AuthProvider` calling
`GET /api/portal/auth/me`.

### Auto-registered template

On the first OTP request after a fresh deploy the backend registers this
template with Meta automatically — no manual WABA Manager step required.

| Field | Value |
|-------|-------|
| Name | `tvk_portal_otp_styled` (override with `META_OTP_TEMPLATE_NAME`) |
| Category | `UTILITY` |
| Language | `en_US` (override with `META_OTP_TEMPLATE_LANGUAGE`) |
| Body | (matches the in-app preview — TVK Mylapore Portal heading + 5-min validity + do-not-share warning) |
| Button | `COPY_CODE`, label "Copy code", parameter = the OTP digits |

UTILITY templates aren't auto-approved like AUTHENTICATION ones; expect a
short PENDING window (seconds to a few minutes) the very first time. While
PENDING, the route returns 503 "OTP service is finishing setup. Please
retry in a few seconds." Once APPROVED, it stays cached in process memory
and every send is one fast Meta call.

### Admin-only escape hatches

When `PORTAL_ADMIN_TOKEN` is set on the backend and the request includes a
matching `x-portal-admin-token` header, the OTP endpoint:

- accepts `force: 'text'` to bypass the template and send a plain free-form
  text instead — useful when the template is stuck in review;
- echoes the raw OTP code back as `_devCode` in the response so the rest of
  the pipeline (verify, register) can be exercised without WhatsApp delivery;
- exposes `GET /api/portal/auth/diag` for live config + template status +
  per-phone OTP history.

## Backend env vars (extras for the portal)

Add these to `backend/.env` alongside the existing variables — none of them
affect the WhatsApp bot, they just enable the portal:

```
PORTAL_JWT_SECRET=<long random string>
META_OTP_TEMPLATE_NAME=tvk_portal_otp_styled   # default; override only if you renamed the template
META_OTP_TEMPLATE_LANGUAGE=en_US
PORTAL_ADMIN_TOKEN=<long random string>        # optional, gates /auth/diag + force/_devCode
```

## Deploying to Vercel

1. Vercel → **Add New** → **Project** → import this repo.
2. **Root Directory**: `grievance-portal`
3. Framework preset auto-detects as **Vite**.
4. Environment variables → add `VITE_API_URL` pointing at your deployed
   backend root, e.g. `https://tvk-mla-support.onrender.com/api`.
5. Deploy. The `vercel.json` here handles the SPA rewrite (and explicitly
   excludes `/api/*` so any accidental same-origin call 404s instead of
   getting swallowed by `index.html`).

## File map

```
src/
  lib/
    api.js          axios instance + token storage
    auth.jsx        AuthProvider / useAuth, hydrates from /portal/auth/me
  components/
    Layout.jsx      Topbar + Outlet + Footer (auth pages bypass it)
    Topbar.jsx      sticky nav, user dropdown
    Footer.jsx      brand footer
    LocationPicker  GPS + manual location capture
  pages/
    LandingPage     hero swaps CTAs based on auth state
    LoginPage       mobile + OTP
    RegisterPage    name + mobile + DOB + optional EPIC + OTP
    GrievanceHome   5-step ticket flow → /portal/grievances
    MyGrievances    list of my tickets
    TrackStatus     lookup by ticket id
  utils/
    servicesData    catalog (ids, titles, images) shared with the bot
  i18n.jsx          language strings (Tamil / English)
  index.css         Tailwind + brand tokens
```
