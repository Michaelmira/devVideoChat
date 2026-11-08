# Next.js Revamp Plan — `revamp-nextjs`

Goal: rebuild devVideoChat (GuildMeet) on Next.js with a modern, leaner stack while
keeping the product the same: same features, same Postgres data, same Stripe and
VideoSDK accounts.

## 1. What exists today (from reading `deployment`)

**Stack:** React 16 + webpack + Babel, React Router, Flux-style context store,
Bootstrap 5 from CDN + hand-written CSS (Tailwind installed but barely used).
Flask 2.0 + SQLAlchemy 1.4 + Flask-JWT-Extended + Alembic, deployed as two
Railway services (frontend + backend).

**Data (3 tables):** `user` (incl. subscription fields), `user_image`,
`video_session` (incl. recording fields).

**Features:**
| Area | Behavior |
| --- | --- |
| Auth | Email/password register → 6-digit email code → login (JWT, 1 day). Google + GitHub OAuth (two parallel sets: regular and "MVP"). |
| Sessions | Create VideoSDK meeting; free = 70 min, premium = 360 min; links expire after 6 h; premium limited to 1 active session; public `/join/:meetingId` issues guest token. |
| Meeting | VideoSDK React SDK: grid/speaker views, timer, host controls, recording button (~1,800-line component). |
| Billing | $3/mo: PaymentIntent, then `confirm-subscription` creates a Stripe Subscription; webhook keeps status in sync; cancel. |
| Recording | Start/stop HLS recording via VideoSDK REST; VideoSDK webhook stores playback URL; recordings list + video.js player. |
| Email | Gmail SMTP for verification codes. |

**Pages:** `/` (landing + login/register), `/dashboard`, `/join/[meetingId]`,
`/video-meeting/[meetingId]`.

## 2. Problems the rewrite fixes

These are bugs or dead code found while reading. The rewrite fixes them instead
of copying them over.

1. **Recording is unreachable.** Recording routes require
   `subscription_status == 'recordings'`, but nothing ever sets that value
   (paid users become `'premium'`). Decide: recording is part of premium, or a
   separate tier.
2. **Possible double charge on upgrade.** The user pays a $3 PaymentIntent, then
   a Subscription is created that bills its first $3 invoice immediately.
   Replace with one Stripe flow (Checkout or Subscription with
   `payment_behavior=default_incomplete`).
3. **Frontend calls endpoints that don't exist:** `forgot-password`,
   `reset-password`, `change-password`, `create-payment-intent`,
   `videosdk/refresh-token`, `videosdk/meeting-token`. Either build them or
   remove the UI.
4. **Hard-coded verification bypass `999000`** in `/verify-code` works in
   production. Make it dev-only.
5. **Tokens in URLs and sessionStorage.** OAuth redirects put the JWT in the
   query string; the app stores it in sessionStorage. Move to httpOnly cookies.
6. **OAuth users get password `oauth_user`.** Anyone can log in to an OAuth
   account with that password. Store no password for OAuth users.
7. **Webhook reads `subscription['current_period_end']`**, which newer Stripe
   API versions moved to subscription items (the code already works around this
   elsewhere).
8. **Leftovers from the mentor app:** `send_email.py` booking emails,
   `calendar_utils.py`, `store/data.js`, mentor/customer decorators, the
   duplicate "MVP" OAuth set, `debug-stripe` / `fix-billing-date` /
   `force-active` debug routes, `AuthDebugComponet.js`.
9. Free-tier comment says 50 min but code uses 70. Confirm which is intended.

## 3. Target stack (recommended)

One Next.js app replaces both Railway services.

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 15, App Router, TypeScript** | Pages and API in one deploy; server components for dashboard data. |
| API | **Route Handlers** (`app/api/**/route.ts`) + Server Actions for forms | Replaces Flask; webhooks stay as plain routes. |
| DB access | **Drizzle ORM** on the existing Postgres | Introspect current tables, so no data migration; typed queries; small runtime. (Prisma is the alternative.) |
| Auth | **Auth.js (NextAuth v5)**: Credentials + Google + GitHub, JWT strategy in httpOnly cookie | Replaces 4 hand-rolled OAuth flows and signed-state code. |
| Validation | **Zod** | Shared schemas for forms and API input. |
| UI | **Tailwind CSS v4 + shadcn/ui**, lucide icons | Drops Bootstrap CDN and the custom CSS files. |
| Client data | **TanStack Query** for polling (session status, recording status) | Replaces Flux store and manual `setInterval`. |
| Video | **@videosdk.live/react-sdk** (client component, `dynamic(..., { ssr: false })`) | Same provider; split the 1,800-line component into pieces. |
| Payments | **Stripe** (`stripe` + `@stripe/react-stripe-js`) | Same account, price ID and webhook. |
| Email | **Nodemailer** with the same Gmail app password (or Resend later) | Same sender. |
| Recording playback | `hls.js` (or video.js) | Lighter than video.js + contrib-hls. |
| Hosting | **Railway**, one service, `next build && next start` | Same platform. |

Removed: webpack/Babel config, Flask, Flask-Admin, Pipenv, Gitpod/Render files,
moment / moment-timezone / date-fns-tz, react-big-calendar, react-calendly,
react-time-picker, react-select, google-api-python-client, Cloudinary (unless
profile photos are kept), sendgrid, APScheduler.

## 4. Project layout

```
app/
  (marketing)/page.tsx              landing + sign-in / sign-up
  dashboard/page.tsx                sessions, upgrade, recordings (server component)
  join/[meetingId]/page.tsx         guest name form
  meeting/[meetingId]/page.tsx      video room (client)
  verify/page.tsx                   email code entry
  api/
    auth/[...nextauth]/route.ts
    register/route.ts
    verify-code/route.ts
    sessions/route.ts                     POST create, GET mine
    sessions/[meetingId]/route.ts         GET public join info + guest token
    sessions/[meetingId]/status/route.ts
    sessions/[meetingId]/recording/route.ts   POST start, DELETE stop, GET status
    recordings/route.ts
    billing/checkout/route.ts
    billing/cancel/route.ts
    webhooks/stripe/route.ts
    webhooks/videosdk/route.ts
components/
  meeting/  (MeetingRoom, ParticipantTile, Controls, Timer, RecordingButton)
  dashboard/ (ActiveSessions, UpgradeCard, PremiumStatus, RecordingsList)
  auth/  ui/
lib/
  db/schema.ts  db/index.ts   auth.ts   stripe.ts   videosdk.ts   email.ts   env.ts (zod-validated)
drizzle/   (introspected baseline)
```

## 5. Data compatibility

- Keep table and column names exactly as they are (`user`, `user_image`,
  `video_session`) so the live database works with no migration. Drizzle
  introspection generates `schema.ts` from it.
- Existing passwords are Werkzeug hashes (`scrypt:` / `pbkdf2:sha256:`).
  Verify them in Node with a small compatible checker, and rehash to bcrypt or
  argon2 on next successful login. Users keep their passwords.
- Add (additive migrations only): nullable `password` for OAuth-only users, and
  optional `accounts` table if Auth.js account linking is wanted.
- Keep the Alembic `alembic_version` table untouched until Flask is retired.

## 6. Phases

1. **Scaffold.** Next.js + TS + Tailwind + shadcn, env validation, Drizzle
   introspection against a copy of the DB, Railway config.
2. **Auth.** Register, email code, credentials login (Werkzeug-hash
   compatible), Google, GitHub, sign-out, protected routes via middleware.
3. **Sessions.** VideoSDK service in TS, create/list/join/status, expiry logic,
   dashboard list.
4. **Meeting room.** Port VideoMeeting into smaller components, guest flow,
   host controls, timer.
5. **Billing.** Single Stripe subscription flow, webhook, cancel, premium status
   UI.
6. **Recording.** Start/stop, VideoSDK webhook, recordings list and player,
   gated by the chosen tier.
7. **Cut-over.** Point OAuth redirect URIs, Stripe webhook and VideoSDK webhook
   at the new app; switch Railway domain; retire Flask service.

Each phase is runnable on its own; Flask stays live on `deployment` until
phase 7.

## 7. Decisions needed

1. Single Next.js app (recommended) vs Next.js frontend + keep Flask API.
2. Recording: included in premium, or separate `recordings` tier/price?
3. Free session length: 50 or 70 minutes?
4. Build forgot/reset/change password, or drop those modals?
5. Keep profile photos (Cloudinary)? No backend route exists for upload today.
6. Keep the "MVP" OAuth variants, or one Google + one GitHub login?
7. Develop against a copy of the production database (recommended) or the live one?
