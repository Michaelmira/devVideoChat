# Next.js Revamp — `revamp-nextjs`

Status: phases 1–6 are built on this branch. Phase 7 (cut-over) is still to do.
The Flask app on `deployment` keeps running until then; both apps can share one database.

## Decisions taken

| Question | Decision |
| --- | --- |
| Architecture | One Next.js 16 app (pages + API) replaces the React frontend and Flask API. |
| Recording | Included in Premium. |
| Free meeting length | 70 minutes (what the code and landing page used); the "50 minutes" upgrade-card text was fixed. |
| Active meetings | One at a time on both plans (free was unlimited before, premium was 1). |
| Password flows | Forgot, reset and change password are built (the old UI called routes that didn't exist). |
| Profile photos | Dropped: no upload route existed. The `user_image` table is kept untouched. |
| OAuth | One Google and one GitHub sign-in (the duplicate "MVP" flows are gone). |
| Auth library | Small custom code (signed JWT cookie + direct OAuth) instead of Auth.js, to keep Werkzeug password compatibility and the existing tables. |
| Payments | Stripe Checkout (hosted) instead of the custom card form. |
| Database | Same tables and columns. Migrations are additive SQL (`db/migrations`), safe to run on the live database. |

## Bugs fixed

1. **Recording was unreachable.** Routes required a `recordings` status nobody had. Now gated on Premium.
2. **Upgrade charged twice.** A $3 PaymentIntent, then a subscription that billed its own first invoice.
   Now one Stripe Checkout payment creates the subscription.
3. **Missing endpoints.** Forgot/reset/change password are implemented. The VideoSDK token-refresh calls are
   no longer needed (tokens are issued per page load, scoped to the room).
4. **`999000` bypass worked in production.** It now only works outside production, and only when
   `VERIFICATION_BYPASS_CODE` is set.
5. **JWT in URLs and sessionStorage.** The session is an httpOnly cookie; OAuth no longer puts tokens in URLs.
6. **OAuth accounts had password `oauth_user`.** New OAuth users get an unusable marker, the login rejects
   `oauth_user`, and `npm run db:fix-oauth-passwords` cleans existing rows.
7. **Webhook read `current_period_end` from the wrong place** for current Stripe API versions. Handled, plus
   webhook events are de-duplicated and re-fetched from Stripe.
8. **Stopping a recording ended the whole meeting** (it called VideoSDK's end-session API). Now it calls the
   recording stop API only.
9. **Every room auto-started recording** (`autoStartRecording` with `VIDEOSDK_RECORDING_ENABLED=true`),
   including free users. Recording now only starts when a Premium host asks.
10. **The meeting time limit was never enforced** (`started_at` was never set). The clock starts when the host
    joins, and the room closes at the plan limit.
11. **Guests got the same powers as hosts / host joined as a guest.** Hosts get moderator tokens; guests get
    join-only tokens scoped to the room.
12. **Account takeover via unverified sign-up.** If someone registered your email without verifying, then you
    signed in with Google/GitHub, their password kept working. It is now cleared.
13. **Verification codes never expired and allowed unlimited guesses.** Codes expire after 30 minutes and lock
    after 5 wrong tries.
14. **Emails were case-sensitive.** `Ada@x.com` and `ada@x.com` were different accounts. Lookups are now
    case-insensitive.
15. **Cancel was immediate.** Cancelling now keeps Premium until the end of the paid period, with a resume option.
16. Removed leftovers from the mentor app: booking emails, calendar helpers, mentor/customer decorators,
    debug routes (`debug-stripe`, `fix-billing-date`, `force-active`) and the auth debug component.

## Phase 7: cut-over checklist

- [ ] Create the Railway service from `revamp-nextjs` and set variables (see README).
- [ ] Pre-deploy command `npm run db:migrate` (additive; Flask keeps working).
- [ ] Register new OAuth redirect URIs (Google and GitHub) for the new URL.
- [ ] Point the Stripe webhook at `<APP_URL>/api/webhooks/stripe` and update `STRIPE_WEBHOOK_SECRET`.
- [ ] Test sign-up, a meeting with two browsers, upgrade (test card), recording and cancel.
- [ ] Run `npm run db:fix-oauth-passwords` on production.
- [ ] Move the public domain to the new service, then retire the Flask services.
- [ ] Rotate the secrets that were pasted into chat (database password, Gmail app password, OAuth secrets,
      VideoSDK secret, Stripe keys, JWT secret).

## Not verified here

This container could not reach VideoSDK, Stripe or the Railway database, so these paths are written to the
providers' APIs but were not exercised end to end: creating rooms, recording, Checkout and webhooks. Auth,
the dashboard, join/lobby pages, session timing and the password flows were tested in a browser against a
local Postgres copy of the schema.
