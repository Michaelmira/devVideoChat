# GuildMeet

One-click video meetings. Create a meeting, share the link, and guests join from their browser.
Free meetings run up to 70 minutes. Premium ($3/month) gives 6-hour meetings and cloud recording.

Built with Next.js 16 (App Router, TypeScript), Drizzle ORM on Postgres, VideoSDK, Stripe and Tailwind CSS 4.

## Getting started

Requires Node.js 20.9+ and a Postgres database.

```bash
npm install
```

```bash
cp .env.example .env
```

```bash
npm run db:migrate
```

```bash
npm run dev
```

Open http://localhost:3000. With `GMAIL` unset, verification codes and reset links print to the server log.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server (`PORT` is respected) |
| `npm run db:migrate` | Applies `db/migrations/*.sql` once each (safe to run on every deploy) |
| `npm run db:fix-oauth-passwords` | One-off: disables the `oauth_user` placeholder password the old app gave Google/GitHub sign-ups |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint |

## Testing

**Unit tests** (`npm test`) cover password-hash compatibility and meeting timing.

**End-to-end tests** (`npm run test:e2e`) run the production build in Chromium with Playwright:

- A fresh Postgres database is created for every run. Set `TEST_DATABASE_URL`; the database name must contain
  `test`. The default is `postgres://postgres:postgres@localhost:5432/devvideochat_test`.
- VideoSDK and Stripe are replaced by `e2e/mock-server.ts`, including a stand-in Stripe Checkout page. No real
  keys or network access are used, and a local `.env` is ignored.
- Projects: `desktop` (main suite), `mobile` (Pixel 7 layout checks), and `isolated` (tests that change shared
  mock state, run last with one worker).

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/devvideochat_test npm run test:e2e
```

Set `E2E_SKIP_BUILD=1` to reuse the last `next build`. Use `npx playwright test --ui` to debug, and
`npx playwright show-report` after a CI failure. CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit and
end-to-end tests on every push.

| Spec | Covers |
| --- | --- |
| `auth.spec.ts` | Sign-up, verification codes (expiry, lockout, resend), sign-in, Flask hashes, `?next`, OAuth redirects and state checks |
| `password.spec.ts` | Forgot/reset (single use, expiry), change/set password, profile edits |
| `dashboard.spec.ts` | Create/end meetings, plan limits, expiry, copy link, plan card |
| `meeting.spec.ts` | Join page, lobby, expired/ended links, old-link redirect, host vs guest tokens |
| `billing.spec.ts` | Checkout upgrade, cancel/resume, customer reuse, Stripe webhook signatures, statuses, duplicates |
| `recording.spec.ts` | Recording permissions and lifecycle, VideoSDK webhooks, session status/start API |
| `responsive.spec.ts` | No horizontal scrolling on phone-sized screens |
| `isolated.spec.ts` | VideoSDK outage while creating a meeting |

Not covered here (needs real services): live video between two browsers, the real Stripe Checkout page, and
Google/GitHub sign-in.

## How it fits together

```
src/
  app/
    (site)/            landing, verify, forgot/reset password, dashboard
    join/[meetingId]   guest name form
    meeting/[meetingId] video room (host or guest)
    actions/           server actions: auth, sessions, billing
    api/               OAuth, session status/start/recording, Stripe + VideoSDK webhooks
  components/          UI, dashboard, meeting room
  lib/                 db schema, auth/session cookie, Stripe, VideoSDK, email, env
db/migrations/         SQL migrations (additive; the old Flask tables are kept as-is)
```

- **Auth:** email + password with a 6-digit email code, or Google/GitHub. The session is a signed JWT in an
  httpOnly cookie. Password hashes are Werkzeug-compatible, so existing users keep their passwords.
- **Meetings:** each meeting is a VideoSDK room. Hosts get moderator tokens and guests get join-only tokens,
  both scoped to the room. The plan clock starts when the host first joins.
- **Billing:** Stripe Checkout creates the subscription in one payment. Webhooks keep the plan in sync, and
  cancelling keeps Premium until the end of the paid period.
- **Recording:** Premium hosts start and stop recording from the meeting. Finished files are fetched from the
  VideoSDK API and listed on the dashboard.

## Deploying to Railway

1. Create one service from this repo. Railway detects Next.js and runs `npm run build` and `npm start`.
2. Set the variables from `.env.example`. Set `APP_URL` to the service's public URL.
3. Set the pre-deploy command to `npm run db:migrate`.
4. Update external settings to point at the new URL:
   - Google OAuth redirect URI: `<APP_URL>/api/auth/google/callback`
   - GitHub OAuth callback URL: `<APP_URL>/api/auth/github/callback`
   - Stripe webhook endpoint: `<APP_URL>/api/webhooks/stripe`, with events `checkout.session.completed` and
     `customer.subscription.*`
5. Run `npm run db:fix-oauth-passwords` once against the production database.

Links shared from the old app (`/video-meeting/:id`) redirect to `/join/:id`.
