# Post-Deployment Fixes — June 27, 2026

## Auth Setup

### Issue: Stuck on "Loading session…" and "private workspace cannot verify"

**Root cause:** The `@neondatabase/auth` React adapter (`createAuthClient` + `BetterAuthReactAdapter`) tries to call better-auth API routes (e.g., `/api/auth/session`) on the Neon Auth host. These routes don't exist on Neon's managed auth service — it only provides JWT verification endpoints (JWKS) and sign-in/sign-up endpoints. The `useSession()` hook hangs indefinitely waiting for a response that never comes.

**Fix:** Replaced the better-auth React client with direct `fetch()` calls to Neon Auth's actual REST endpoints. `useSession()` now returns a static `{ data: null, isPending: false }` and the app gates on `authorizedRole` from `/api/me` instead of session state.

**Files changed:**
- `src/app/auth.ts` — removed `createAuthClient`/`BetterAuthReactAdapter`, added direct `fetch` to `{authUrl}/api/auth/sign-in/email`, `sign-up/email`, `sign-out`
- `src/app/App.tsx` — auth gate uses `authorizedRole` instead of `session.data`

### Issue: Email not verified in Neon Console

**Symptom:** Sign-in fails because Neon Auth requires verified emails by default. The Neon Console has no way to manually verify emails.

**Fix:** In Neon Console → Auth → Settings → disable **"Require email verification"** temporarily while setting up both accounts. Re-enable after.

### Issue: NEON_AUTH_URL not set in Cloudflare

**Symptom:** `/api/me` returns 500 because `parseServerEnv` requires `NEON_AUTH_URL`.

**Fix:** Set as Cloudflare secret:
```sh
echo "https://ep-patient-feather-a62cajlb.neonauth.us-west-2.aws.neon.tech/neondb/auth" | npx wrangler pages secret put NEON_AUTH_URL --project-name seine-studio
```

### Issue: VITE_NEON_AUTH_URL not in build

**Symptom:** Auth client disabled because `authEnabled` requires both `VITE_DATA_MODE=api` and a valid auth URL.

**Fix:** Added to `build:api` script in `package.json`:
```json
"build:api": "VITE_DATA_MODE=api VITE_NEON_AUTH_URL=https://ep-patient-feather-a62cajlb.neonauth.us-west-2.aws.neon.tech vite build"
```

### Issue: Sign-up/Sign-in returns 404 from Neon Auth API

**Symptom:** "Sign up failed 404" or "Sign in failed 404" after deployment.

**Root cause:** Neon Auth hosts two separate things at different URL paths:
- **JWT verification (JWKS):** `https://...neonauth...tech/neondb/auth/.well-known/jwks.json` — used by `NEON_AUTH_URL` on the server
- **REST API (sign-in/sign-up):** `https://...neonauth...tech/api/auth/sign-in/email` — at the **root level**, NOT under `/neondb/auth`

The client was using the `/neondb/auth` subpath for API calls, which returns 404.

**Fix:** `VITE_NEON_AUTH_URL` now points to the root domain:
```
https://ep-patient-feather-a62cajlb.neonauth.us-west-2.aws.neon.tech
```
The server-side `NEON_AUTH_URL` secret stays with the `/neondb/auth` subpath (for JWKS).

**June 27 follow-up:** `.env.local` and `.env.example` were still using the old `/neondb/auth` suffix. Fixed `.env.local` to use the root domain and updated `.env.example` with explanatory comments about the two-URL distinction. `.dev.vars.example` also updated with the same guidance.

**⚠️ CORRECTION (June 27, later) — the diagnosis above was WRONG.**

The `/api/auth/*` root paths never actually worked. The neonauth proxy parses the
first URL path segment as the database name, so `POST /api/auth/...` resolves database
`api` → `database "api" does not exist` (or a bare 404). The real Better Auth REST API is
mounted at the **`/neondb/auth` base** with routes **directly under it (no `/api/auth`
prefix)**. Verified working:

| Endpoint | Path | Status |
|----------|------|--------|
| Sign up | `POST /neondb/auth/sign-up/email` | ✅ (needs `Origin` header / trusted origin) |
| Sign in | `POST /neondb/auth/sign-in/email` | ✅ |
| Session | `GET /neondb/auth/get-session` | ✅ |
| Token | `GET /neondb/auth/token` | ✅ |
| Sign out | `POST /neondb/auth/sign-out` | ✅ (JSON content-type) |
| JWKS | `GET /neondb/auth/.well-known/jwks.json` | ✅ |

**Corrected configuration (both URLs are now the SAME):**
- `VITE_NEON_AUTH_URL` (client) = `https://...neonauth...tech/neondb/auth`
- `NEON_AUTH_URL` (server) = `https://...neonauth...tech/neondb/auth`

`src/app/auth.ts` fetch paths changed from `${authUrl}/api/auth/...` → `${authUrl}/...`.

**Second blocking bug found the same day:** `useSession()` in `auth.ts` was a hardcoded
stub returning `{ data: null }`. `App.tsx` gates the `/api/me` authorization call on
`session.data?.user`, so even a successful sign-in never advanced past the sign-in screen.
`useSession()` now fetches `/neondb/auth/get-session` and re-fetches when sign-in/sign-out
call `notifySessionChanged()`.

**Third bug — server JWT iss/aud mismatch:** Neon Auth issues JWTs whose `iss`/`aud` are
the host **origin** (no `/neondb/auth`), while JWKS is served from the subpath. The server
was validating `issuer`/`audience` against the full `/neondb/auth` URL, so every `/api/me`
returned 401 `invalid_session`. Fixed in `functions/_shared/auth.ts`: JWKS still fetched
from the subpath, but `issuer`/`audience` now validated against `new URL(authUrl).origin`.

**Root cause of the outage:** Neon Auth had been de-provisioned for the `production`
branch (no `neon_auth` schema, every endpoint 404 `role not found`). Re-provisioned via
the Neon MCP against database `neondb`, email/password enabled, email verification off,
trusted origins added (`https://seine-studio.pages.dev`, `https://*.seine-studio.pages.dev`).

### Issue: Sign-in loops back on iOS / installed PWA (cross-site cookie)

**Symptom:** Desktop sign-in works, but on iPhone (especially the installed PWA) entering
the right password just bounces back to the login screen.

**Root cause:** Neon Auth runs on a different registrable domain than the app
(`…neonauth.…neon.tech` vs. `seine-studio.pages.dev`), so its session cookie
(`__Secure-neon-auth.session_token`, `SameSite=None; Partitioned; HttpOnly`) is a
**cross-site** cookie. iOS WebKit refuses to persist third-party cookies, so `/get-session`
returns null after sign-in and the app loops. Neon Auth's bearer-token mode is not enabled
(no `set-auth-token` header), so there's no client-side token fallback.

**Fix:** Proxy the auth API under the app's own origin so the cookie is first-party.
- `functions/neon-auth/[[path]].ts` — catch-all Pages Function forwarding `/neon-auth/*`
  to `${NEON_AUTH_URL}/*`, passing Set-Cookie through (binds to the app domain) and forcing
  a trusted `Origin` for Better Auth's CSRF check.
- Client `VITE_NEON_AUTH_URL` = `/neon-auth` (same-origin). `auth.ts` resolves it against
  `window.location.origin`, reads the session via `/neon-auth/get-session`, and exchanges
  the cookie for a JWT via `/neon-auth/token`. The `@neondatabase/auth` adapter was dropped.
- Server `NEON_AUTH_URL` secret unchanged — the proxy forwards to it and JWKS uses it.

Verified: proxied sign-in sets the cookie on `seine-studio.pages.dev` (first-party);
get-session, token, and `/api/me` all succeed through the proxy.

### Issue: Neon Auth `database "api" does not exist`

**Symptom:** All Neon Auth API calls return `DATABASE_UNAVAILABLE` with cause `database "api" does not exist`. JWKS endpoint works but sign-up/sign-in/health all fail.

**Root cause:** Neon Auth was initially configured with a database named `api` that no longer exists. The project's actual database is `neondb`. Changing the database dropdown in the Neon Console Auth settings doesn't update the running Auth service configuration.

**Fix:**
1. In Neon Console → Auth → disable Auth, then re-enable it. This reconfigures Auth to use the current database (`neondb`).
2. If re-enabling fails with `NEON_AUTH_SCHEMA_NOT_FOUND`, the `neon_auth` schema was lost. Re-enabling Auth should recreate it automatically.
3. If Auth still fails, verify the schema exists: connect to the database and run `CREATE SCHEMA IF NOT EXISTS neon_auth`, then re-enable Auth in the Console.

### Issue: Email verification disabled (June 27)

**Decision:** Email verification is disabled for the two-user private setup. The sign-up flow skips the verification step — after creating an account, the user goes directly to "Account created — go to sign in."

**Neon Console:** Disable **"Require email verification"** in Auth → Settings.

**Code change:** `SignInPage.tsx` → `handleSetup()` now sets `setSetupSuccess(true)` instead of `setNeedsVerification(true)`, skipping the verification code UI.

**Files changed:** `src/app/components/SignInPage.tsx`

### Issue: Trusted origins not configured

**Symptom:** Neon Auth rejects sign-in requests from unrecognized domains.

**Fix:** In Neon Console → Auth → Settings → Trusted Origins, add:
- `https://seine-studio.pages.dev`
- `https://*.seine-studio.pages.dev`
- `http://localhost:5173`

---

## UI/UX Fixes

### Issue: Bell icon invisible on fresh install

**Root cause:** `NotificationBadge` returned `null` when `count === 0`, hiding the bell entirely. Users couldn't access notification settings.

**Fix:** Bell always renders. Badge count only shown when > 0. Inline `var(--canvas)` replaced with `bg-card`.

**File:** `src/app/components/NotificationsPanel.tsx`

### Issue: Transparent modals (notifications, notification settings)

**Root cause:** Modal backgrounds used `style={{ background: "var(--canvas)" }}` — inline styles can't resolve CSS custom properties, rendering transparent.

**Fix:** Replaced all inline `var(--...)` references with Tailwind classes (`bg-card`, `text-accent`, `text-muted-foreground`, `text-emerald-700`, `text-red-600`). Centered modals vertically on mobile.

**Files:** `src/app/components/NotificationsPanel.tsx`, `src/app/components/NotificationSettings.tsx`

### Issue: iOS form input auto-zoom

**Root cause:** Safari zooms when input `font-size < 16px`.

**Fix:** Viewport meta updated to `maximum-scale=1.0, user-scalable=no`.

**File:** `index.html`

### Issue: Pull-to-refresh spinner glitchy

**Root cause:** Custom touch-based spinner fought browser's native scroll behavior.

**Fix:** Removed custom `PullToRefresh` component. Added ↻ refresh button in mobile TopBar with fade animation before `window.location.reload()`.

**Files:** Removed `src/app/components/PullToRefresh.tsx`, updated `src/app/App.tsx`

### Issue: Content overlapping notch/status bar

**Root cause:** `h-dvh` + no safe-area padding caused content to bleed into the notch area on iPhones.

**Fix:** Changed `h-dvh` to `h-screen` (static small viewport height). Added `paddingTop: env(safe-area-inset-top)` and `paddingBottom: env(safe-area-inset-bottom)` to root container. TopBar uses `sticky top-0` on mobile.

**File:** `src/app/App.tsx`, `index.html`

### Issue: Accounting page too large, tiny text

**Root cause:** 28+ instances of `text-[9px]` and `text-[10px]` — below the 11px minimum. Card styling didn't match Overview page.

**Fix:** Bulk replaced all `text-[9px]` → `text-[11px]`, `text-[10px]` → `text-[12px]`. StatCards now match `MetricCard` from Overview (Playfair values, 11px labels, `p-4 sm:p-5`). Page spacing tightened (`space-y-6` → `space-y-4`). Tab switching auto-scrolls to top.

**File:** `src/app/components/AccountingPage.tsx`

### Issue: API mode not enabled in production

**Root cause:** `VITE_DATA_MODE=api` was not set during Vite build — all pages showed "Sample workspace · changes last only until refreshed."

**Fix:** `VITE_DATA_MODE=api` passed at build time. `build:api` and `deploy` npm scripts added to `package.json`.

**File:** `package.json`

---

## Database

### Issue: Migrations 0004–0007 not in Drizzle tracker

**Root cause:** Hand-written migration files (0004–0007) lacked proper Drizzle snapshot files.

**Fix:** Used `drizzle-kit generate` to produce migration 0007 (`equal_blink.sql`), then applied it via direct Neon SQL API. All 37 DDL statements executed successfully.

### Issue: drizzle-kit migrate fails in VS Code terminal

**Root cause:** drizzle-kit requires interactive TTY for confirmation prompts.

**Fix:** Used `fetch` to Neon SQL API with the migration SQL directly.

---

## Deployment

### Current Deploy Command
```sh
npm run deploy
```
This runs `build:api` (which sets `VITE_DATA_MODE=api` + `VITE_NEON_AUTH_URL`) then deploys to Cloudflare Pages.

**⚠️ Two different Neon Auth URLs:**
- `NEON_AUTH_URL` (server secret): `https://...neonauth...tech/neondb/auth` — for JWT/JWKS verification
- `VITE_NEON_AUTH_URL` (build-time): `https://...neonauth...tech` — for REST API calls (sign-in/sign-up)

### Cloudflare Secrets (all set)
- `DATABASE_URL` — Neon Postgres connection string
- `NEON_AUTH_URL` — `https://...neonauth...tech/neondb/auth` (for server JWT verification)
- `OWNER_EMAIL` — `seinestudio.info@gmail.com`
- `DEVELOPER_EMAIL` — `andrelawas35@gmail.com`

### Production URL
https://seine-studio.pages.dev
