# TVK — WhatsApp Grievance Chatbot + Admin Panel

A complete WhatsApp Cloud API grievance/service-request chatbot for **TVK – Tamilaga Vettri Kazhagam** with a React admin console.

## Features

- **WhatsApp welcome flow** triggered by greetings (`hi`, `hello`, `vanakkam`, `namaste`, …) — sends a native WhatsApp interactive flow message with a banner header, body, footer and **Choose Service** CTA.
- **Single Flow, multiple screens, fully dynamic** (Meta Endpoint / Data API mode):
  - **Service Selection** — banner + radio list with icons for the 9 TVK services:
    - Civic Works · Revenue · Health · Education · Ration · Agriculture · Law & Order · Employment · Personal Assistance
  - **Option Selection** — sub-options for the chosen service (e.g. `Civic Works → Road Repair, Street Light, Drainage, Power Issue, Garbage Issue`).
  - **Details** — small form (name, location, description). The submission becomes a `ServiceRequest` in the admin panel.
  - **Thank you** terminal screen.
- **Admin panel** (React + Vite + Tailwind) with five pages:
  - **Dashboard** — counts, requests by service, recent requests / members / campaigns, real-time campaign template statuses.
  - **Service Requests** — full list with filters (status / service / search), inline status workflow + internal notes.
  - **Members** — every WhatsApp contact who has chatted; click a member to see all their requests.
  - **Campaigns** — build a WhatsApp template (header text/image/video/document, body, footer, reply / URL CTA / call CTA buttons), submit to Meta, watch its status (`PENDING → APPROVED → REJECTED`) live, and broadcast approved templates to every member.
  - **Flow Images** — upload icons/banners for every flow screen (welcome banner, service icons, sub-screen banners, option icons).
- The bot **stores every WhatsApp number that has ever messaged it** as a `Member`, so the campaign broadcast goes to all of them.

---

## Project layout

```
TVK/
├── backend/        Node/Express + Mongoose API + Webhook + Flow endpoint
└── frontend/       React + Vite + Tailwind admin console
```

---

## 1. Install

```bash
# Backend
cd backend
npm install

# Frontend (separate shell)
cd frontend
npm install
```

---

## 2. Configure `backend/.env`

A pre-populated `.env` is included with the Meta + Mongo + Cloudinary credentials for this deployment. The placeholders filled in by `npm run flow:setup` are:

```env
WHATSAPP_FLOW_ID=
WHATSAPP_FLOW_STATUS=
FLOW_PRIVATE_KEY=
FLOW_PUBLIC_KEY=
```

`BACKEND_URL` must be **HTTPS** and publicly reachable so Meta can call the Flow endpoint and webhook. For local development use [ngrok](https://ngrok.com/):

```bash
ngrok http 5050
# Copy the https URL into BACKEND_URL in backend/.env
```

---

## 3. One-shot WhatsApp Flow setup

```bash
cd backend
npm run flow:setup
```

This single command:

1. Generates an RSA-2048 keypair and saves `FLOW_PRIVATE_KEY` / `FLOW_PUBLIC_KEY` into `.env`.
2. Uploads the public key to Meta (`/{phone-number-id}/whatsapp_business_encryption`).
3. Creates the *TVK Grievance* flow on Meta with `endpoint_uri = ${BACKEND_URL}/api/flow-endpoint`.
4. Uploads the flow JSON.
5. **Publishes the flow** so it can be sent to end-users.
6. Saves `WHATSAPP_FLOW_ID` and `WHATSAPP_FLOW_STATUS=PUBLISHED` back into `.env`.

Restart the backend after this completes.

(If you prefer the steps individually: `flow:keys` → `flow:upload-key` → `flow:create`.)

---

## 4. Configure Meta webhook

In **Meta → WhatsApp → Configuration → Webhook**:

- **Callback URL:** `${BACKEND_URL}/api/webhook/meta`
- **Verify token:** value of `META_VERIFY_TOKEN` (default `tvk_verify_token`)
- **Subscribed fields:** `messages`, `message_template_status_update`

The `message_template_status_update` subscription lets the dashboard reflect template approval/rejection in real time.

---

## 5. Run

```bash
# Backend
cd backend
npm run dev    # → http://localhost:5050

# Frontend
cd frontend
npm run dev    # → http://localhost:5174
```

Login with the credentials in `backend/.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`, default `admin` / `admin@123`).

> First-time admin login is auto-seeded the first time the backend connects to Mongo.

---

## 6. Test it

1. From the **Flow Images** admin page, upload images for at least:
   - `flow_welcome_banner` (top of service screen)
   - `chat_welcome_header` (header image of the welcome WhatsApp message)
   - the 9 **service icons** (`icon_civic_works`, `icon_revenue`, …)
   - per-option icons under the *Options — civic_works* etc. groups (recommended).
2. From your phone, send `hi` to the WhatsApp number connected to `META_PHONE_NUMBER_ID`.
3. You should receive an image header + body + **Choose Service** button.
4. Tap it → SERVICE_SELECT screen with 9 services (each with its icon).
5. Pick a service → OPTION_SELECT screen with the sub-options for that service.
6. Pick an option → DETAILS form. Submit → confirmation screen.
7. The new request appears under **Service Requests** in the admin panel; the contact is saved under **Members** with `requestCount` incremented.

---

## 7. Send a campaign

1. Go to **Campaigns → New Template**.
2. Fill in:
   - lower_snake_case **name** (e.g. `tvk_event_invite`),
   - language, category,
   - header (TEXT / IMAGE / VIDEO / DOCUMENT),
   - body (mandatory), footer (optional),
   - up to 10 buttons (Reply / URL CTA / Call CTA).
3. Click **Submit to Meta** — the template is uploaded via `POST /{waba_id}/message_templates`. Its initial status is **PENDING**.
4. The card auto-refreshes every 20 s; click **Sync status** to force a refresh, or wait for the `message_template_status_update` webhook to update it instantly.
5. Once **APPROVED**, click **Send** to broadcast the template to every Member stored in MongoDB.

---

## API surface (admin)

All endpoints under `/api/*` require `Authorization: Bearer <jwt>` except `/api/auth/login`, `/api/webhook/*`, and `/api/flow-endpoint`.

| Method | Path | Purpose |
|---:|---|---|
| POST   | `/api/auth/login`                        | Admin login |
| GET    | `/api/auth/verify`                       | Validate token |
| GET    | `/api/dashboard/stats`                   | Dashboard summary |
| GET    | `/api/service-requests`                  | List requests (`?status=&serviceId=&q=`) |
| GET    | `/api/service-requests/catalog`          | Static service catalog |
| PATCH  | `/api/service-requests/:id`              | Update status / notes |
| DELETE | `/api/service-requests/:id`              | Delete |
| GET    | `/api/members`                           | List members + request counts |
| GET    | `/api/members/:id`                       | Member detail + their requests |
| DELETE | `/api/members/:id`                       | Delete member |
| GET    | `/api/campaigns`                         | List templates |
| POST   | `/api/campaigns`                         | Create template (multipart) and submit to Meta |
| POST   | `/api/campaigns/sync`                    | Refresh statuses from Meta |
| POST   | `/api/campaigns/:id/send`                | Broadcast approved template to all members |
| DELETE | `/api/campaigns/:id`                     | Delete (also from Meta) |
| GET    | `/api/flow-images`                       | List image slots |
| POST   | `/api/flow-images/:key`                  | Upload image (multipart) |
| DELETE | `/api/flow-images/:key`                  | Clear image |
| GET/POST | `/api/webhook/meta`                    | Meta webhook (messages + template status updates) |
| POST   | `/api/flow-endpoint`                     | Encrypted Flow endpoint |

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Webhook stays *Not verified* | `META_VERIFY_TOKEN` must match the value entered in Meta. |
| Flow never opens / "Try again" | Public key not uploaded — re-run `npm run flow:upload-key`. |
| Flow opens to a blank screen | Check backend logs — `[FlowEndpoint] decrypt failed` means key mismatch. |
| Banner / icons don't show up | Upload the corresponding key from **Flow Images** (or wait up to 10 min for cache). |
| Greeting message ignored | Check `META_ACCESS_TOKEN` & `META_PHONE_NUMBER_ID` are valid. |
| Template stays PENDING for a long time | Click **Sync status** on the Campaigns page. |
