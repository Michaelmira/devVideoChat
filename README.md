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
