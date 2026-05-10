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

Two-step OTP. The delivery channel is chosen automatically per request:

- **Inside the user's 24-hour WhatsApp window** (they messaged the bot in
  the last 23 hours) → free-form text message via `sendOtpText`. **Free.**
- **Outside the window / first-ever contact** → AUTHENTICATION-category
  template via `sendOtpTemplate`. Costs one conversation per send.

The dispatcher reads `Member.lastInboundAt`, which the bot's webhook handler
updates on every inbound. The portal never writes that field, so it cleanly
represents "WhatsApp activity only".

Flow:

1. The portal posts `{ phone, mode }` to `POST /api/portal/auth/send-otp`.
2. The backend hashes a 6-digit code into the `OtpCode` collection (TTL 5 m,
   max 5 attempts) and dispatches it on the channel above.
3. The response includes `channel: 'text' | 'template'` so the UI / logs can
   show which path was used.
4. The user submits the code; `verify-otp` (login) or `register` (one-shot
   register) returns a 30-day JWT, stored in `localStorage` as
   `tvk_portal_token`.

Sessions are auto-rehydrated on page load by `AuthProvider` calling
`GET /api/portal/auth/me`.

### Required Meta template (only used when window is closed)

Register an Authentication template in WABA Manager:

| Field | Value |
|-------|-------|
| Name | `tvk_portal_otp` (or whatever you set in `META_OTP_TEMPLATE_NAME`) |
| Category | `AUTHENTICATION` |
| Language | `en_US` (or whatever you set in `META_OTP_TEMPLATE_LANGUAGE`) |
| Body | `Your TVK Mylapore portal verification code is {{1}}.` |
| Button | OTP / Copy code, parameter = `{{1}}` |

Until this template is approved, first-time visitors who haven't yet messaged
the bot will receive a 502 with a hint to WhatsApp the number once before
retrying. Returning users (active 24h window) work immediately because they
hit the free-form branch.

## Backend env vars (extras for the portal)

Add these to `backend/.env` alongside the existing variables — none of them
affect the WhatsApp bot, they just enable the portal:

```
PORTAL_JWT_SECRET=<long random string>
META_OTP_TEMPLATE_NAME=tvk_portal_otp
META_OTP_TEMPLATE_LANGUAGE=en_US
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
