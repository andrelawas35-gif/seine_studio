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

## Data Interconnectedness (June 28, 2026)

Cross-component data wiring pass — components were rendering disconnected or
studio-wide data instead of the live, correctly-scoped records.

### Issue: Overview dashboard blank in production

**Root cause:** `OverviewPage` computed every metric off `INITIAL_PROJECTS`/
`INITIAL_CLIENTS`, which are empty arrays (`data.ts`). Even in API mode the
dashboard never fetched anything, so it was permanently blank. It also depended
on fixture-only fields (`project.price`, `downpaid`) that don't exist on
`ProjectRecord`.

**Fix:** Rewrote `OverviewPage` to fetch live `ProjectRecord[]` + `ClientRecord[]`
(fixture fallback off-API) with loading/error states. Replaced the fixture-only
metrics (`Pipeline Revenue`, `Awaiting DP`) with `Due This Week` and `Overdue`,
both derived from `targetDate`. Removed the redundant Price column from Recent
Projects. Uses the real 11-stage model.

**File:** `src/app/pages/CorePages.tsx`

### Issue: Event finance summed all studio invoices

**Root cause:** The Events finance tab fetched `/api/invoices?limit=200` (every
invoice) and summed them onto the event — the code comment admitted "invoices API
may not support eventId filter yet." Expenses were already event-filtered.

**Fix:** Added an `eventId` query param to the invoices list endpoint that joins
through `projects` and filters `projects.eventId = :eventId` (invoices reach an
event via their project). Finance tab now calls `/api/invoices?eventId=…`.

**Note:** This links invoices to an event *through their project*. A walk-up sale
at a pop-up with no project is not counted — would need a direct `invoices.event_id`
column (migration) if ad-hoc event sales become a thing.

**Files:** `functions/api/invoices/index.ts`, `src/app/components/EventsPage.tsx`

### Enhancement: Overview calendar (deadlines, not just events)

The "Event calendar" in the Events page was only a vertical list of events; the
`react-day-picker` primitive at `ui/calendar.tsx` was unused. Added a real
calendar to the Overview overlaying **all dated work**: project deadlines
(`targetDate`), events (`startsAt`), unpaid invoice due dates (`dueDate`), and
open repair promises (`promisedDate`). Month grid on desktop, agenda list on
mobile (mobile-first). Calendar sources fetch via `Promise.allSettled` so a
failure there never blanks the dashboard. An Events & Pop-ups list sits at the
bottom of the Overview.

**Files:** `src/app/components/OverviewCalendar.tsx` (new), `src/app/pages/CorePages.tsx`

### Issue: Accounting + Reply Templates fed empty fixtures

**Root cause:** `App.tsx` passed `INITIAL_PROJECTS`/`INITIAL_CLIENTS`/
`INITIAL_INVENTORY` (empty/static) as props to `AccountingPage` and
`ReplyTemplatesPage`. In production this meant the pricing calculator and
reply-template pickers were empty, and Accounting's "Pipeline Revenue" stat read
the nonexistent `project.price` (always ₱0). The invoice/quote/expense *modals*
are fixtures-mode-only (those tabs are hidden in API mode), so only the pricing
calculator, pickers, and the pipeline stat were affected in production.

**Fix:** New `useReferenceData` hook fetches live projects/clients/inventory and
adapts them to the fixture shapes those components already consume (so the
calculator and pickers stay unchanged). Both pages now call the hook instead of
receiving props; `App.tsx` renders them without props. Replaced the broken
"Pipeline Revenue" stat with a real **Open Quotes** count derived from the quotes
source records (`sent` + `accepted`).

**Files:** `src/app/components/useReferenceData.ts` (new),
`src/app/components/AccountingPage.tsx`, `src/app/components/ReplyTemplatesPage.tsx`,
`src/app/App.tsx`

### Remaining (shaped, not yet built)

- **Shared client/location cache** — pages still re-fetch `/clients`
  independently; `useReferenceData` is a first step toward consolidating this.
- **Linked-projects panel on Events** + retire the through-project invoice link
  for a direct column if walk-up sales matter.
- **Derived client/project money** — surface `Client` lifetime spend and project
  price/balance from invoices on their detail panels (the fixture adapter
  currently zeroes these).

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

---

## Remaining Work (June 28, 2026)

### P2 — Linked-projects panel on Events + direct `invoices.event_id`
**Status:** ✅ Complete (June 28)
**Issue:** (a) Event detail didn't show projects linked via `projects.event_id`. (b) Invoices endpoint joined through `projects.event_id` instead of using the direct `invoices.event_id` column (added in Wave 0 M0.4).
**Fix:** Extended `GET /api/events/:eventId` to return `linkedProjects`. Updated `GET /api/invoices` to filter by `invoices.event_id` directly and removed the `projects` join. Added linked-projects panel to EventsPage overview tab with stage dots, project numbers, and client names.
**Files:** `functions/api/events/[eventId].ts`, `functions/api/invoices/index.ts`, `src/app/events.ts`, `src/app/components/EventsPage.tsx`

### P3 — Derived client/project money
**Status:** ✅ Complete (June 28)
**Issue:** Client lifetime spend and project balance were zeroed in `useReferenceData` (`totalSpent: 0`, `price: 0`). The detail pages showed no financial data.
**Fix:** Extended `GET /api/clients/:id` to return `finance: { lifetimeSpend, balanceDue }` (sum of payments / unpaid invoices). Extended `GET /api/projects/:id` to return `finance: { agreedPriceCents, invoicedCents, paidCents }` (from accepted quote + invoices). ClientsPage now shows Lifetime Spend + Balance Due cards. ProjectsPage now shows Financial Summary grid (Agreed Price, Invoiced, Paid, Balance).
**Files:** `functions/api/clients/[clientId].ts`, `functions/api/projects/[projectId].ts`, `src/app/components/ClientsPage.tsx`, `src/app/components/ProjectsPage.tsx`

### P1 — Shared client/location cache
**Status:** Deferred to Wave 5/6
**Issue:** Pages re-fetch `/clients` and `/locations` independently. `useReferenceData` (added for AccountingPage + ReplyTemplatesPage) is a first step, but doesn't cover EventsPage, QuotesPage, InvoicesPage, or CertificatesPage which also fetch clients.
**Plan:** Create a `ReferenceDataProvider` context when 360 views (Wave 5) drive the need for a single source of truth. Current independent fetches are correct, just not optimal.

---

## Drizzle-ORM Cloudflare Workers Bundler Bug (June 28, 2026)

### Issue: "The request could not be completed" on inventory, events, and other API endpoints

**Root cause:** `db.select({ specific: columns }).from(table).leftJoin(...)` in the Cloudflare
Pages Functions bundled environment triggers `orderSelectedFields` → `Object.entries()` on
`undefined`, producing `TypeError: Cannot convert undefined or null to object`. This only
manifests at runtime in the deployed worker — TypeScript compiles clean locally.

**Fix pattern (applied across 17 files):**
```ts
// ❌ Before (broken in Cloudflare Workers):
const [records] = await db.select({
  id: tableA.id,
  joinedName: tableB.name,
}).from(tableA).leftJoin(tableB, eq(tableA.bId, tableB.id));

// ✅ After (fixed):
const rows = await db.select().from(tableA).leftJoin(tableB, eq(tableA.bId, tableB.id));
const records = rows.map(r => ({
  id: r.table_a.id,
  joinedName: r.table_b?.name ?? null,
}));
```

**Aggregate queries with `groupBy`:** `db.select()` + `.groupBy()` + `.join()` produces
invalid PostgreSQL (`SELECT * GROUP BY` not allowed). Split into separate simple queries
and combined in JS.

**Files changed (all under `functions/api/`):**
- `inventory/index.ts`, `inventory/[lotId].ts`
- `events/[eventId].ts`
- `projects/index.ts`, `projects/[projectId].ts`
- `invoices/index.ts`, `invoices/[invoiceId].ts`
- `quotes/index.ts`, `quotes/[quoteId].ts`
- `expenses/index.ts`, `expenses/[expenseId].ts`
- `certificates/index.ts`, `certificates/[certId].ts`
- `repairs/index.ts`, `repairs/[ticketId].ts`
- `catalog/[pieceId].ts`
- `clients/[clientId].ts`

**Rule:** Never use `db.select({ specific })` combined with `.join()` in Cloudflare Pages
Functions. Always use `db.select()` and manually flatten joined rows.

---

## Project Edit 500 Error (June 28, 2026)

### Issue: Editing a project showed "The request could not be completed"

**Root cause (layered):**

1. **Zod transform bug** (`src/server/projects/input.ts`): `updateProjectInput` transform
   converted `undefined` → `null` for `clientId` via `input.clientId ?? null`. Since
   `client_id` is `.notNull()` in the schema, the handler tried setting it to null, which
   PostgreSQL rejected.

2. **Frontend sending extraneous empty fields** (`src/app/components/ProjectsPage.tsx`):
   The form spread all values (including `projectNumber: ""`, `catalogPieceId: ""`, etc.)
   into the PATCH body. `clientId: ""` failed Zod UUID validation because the schema
   didn't accept empty strings for `clientId` (unlike `eventId` which had `.or(z.literal(""))`).

3. **JSONB serialization** (`functions/api/projects/[projectId].ts`): Activity events
   `before` field contained raw Drizzle Date objects. Needed `JSON.parse(JSON.stringify(...))`
   for proper JSONB storage in the Cloudflare Workers environment.

4. **CHECK constraint `projects_owner_xor`**: A project must have either a client or an
   event. Clearing both simultaneously violates this constraint.

**Fixes applied:**

| File | Change |
|------|--------|
| `src/server/projects/input.ts` | Transform passes `undefined` through when fields aren't provided (instead of defaulting to `null`). Added `.nullable().or(z.literal(""))` for `clientId`. |
| `src/app/components/ProjectsPage.tsx` | PATCH body now builds a clean object with only valid fields, stripping `undefined` keys and extra fields (`projectNumber`, `catalogPieceId`). |
| `functions/api/projects/[projectId].ts` | Activity `before`/`after` now use `JSON.parse(JSON.stringify(...))` for safe JSONB storage. |

---

## Form UI Fixes (June 28, 2026)

### Issue: New Piece form transparent / Expense form text overlapping

**Root cause:**

1. **Piece form**: Used a custom overlay with `style={{ background: "var(--canvas)" }}`.
   Inline styles can't resolve CSS custom properties; `var(--canvas)` resolved to nothing,
   rendering the form transparent. Also used `var(--ink-muted)` which doesn't exist (the
   theme uses `--muted-foreground`).

2. **Expense form**: Labels at `text-[11px]` with `mt-1` spacing caused crowding. COGS/OPEX
   type display stacked 3 text lines with no leading control. Backdrop at `bg-black/20` was
   too faint. No proper scroll containment — the entire panel scrolled including buttons.

3. **Both forms**: Lacked proper scrollable body with pinned header/footer.

**Fixes applied:**

| File | Change |
|------|--------|
| `src/app/components.CatalogPage.tsx` | Replaced custom overlay with `Modal` component (proper `#FAF7F0` background, `rgba(23,20,15,0.45)` backdrop with blur, scrollable body). |
| `src/app/components/ExpensesPage.tsx` | Backdrop changed to `rgba(23,20,15,0.45)` with `backdropFilter: blur(4px)`. Split into header + scrollable body (`overflow-y-auto flex-1`) + pinned footer. Labels increased to `text-[12px]`. Spacing increased: `space-y-4` → `space-y-5`, `mt-1` → `mt-1.5`, `gap-3` → `gap-4`. Input height `min-h-9` → `min-h-10`. COGS/OPEX text given `leading-[1.4]`. |

---

## Modal Conversion Wave (June 28, 2026)

### Issue: 7 forms across 6 pages used custom `fixed inset-0 bg-black/30` overlays instead of the `Modal` component

**Root cause:** Forms were built before the `Modal` component existed or were copied from older patterns. These custom overlays lacked:
- Proper backdrop (`rgba(23,20,15,0.45)` + `blur(4px)` per design system)
- Scrollable body with pinned header/footer — long forms couldn't scroll properly
- Focus trap (Tab cycling within the modal)
- Escape key dismiss
- Body scroll lock when open

**Fixes applied (all 7 converted to `<Modal>`):**

| Page | Modal | Width |
|------|-------|-------|
| `ExpensesPage.tsx` | Log expense | 480px |
| `CertificatesPage.tsx` | New Certificate | 520px |
| `InvoicesPage.tsx` | Create invoice | 480px |
| `InvoicesPage.tsx` | Record payment | 400px |
| `QuotesPage.tsx` | Create quote | 480px |
| `RepairsPage.tsx` | New Repair Ticket | 520px |
| `ProjectsPage.tsx` | Bill deposit / Bill balance | 480px |

Each conversion:
- Replaced `fixed inset-0 ... bg-black/30` overlay + custom section/div with `<Modal>` component
- Old manual header (title + X button) removed — Modal provides its own
- Old manual footer div removed — buttons passed via `footer` prop
- Form body becomes Modal `children`, auto-wrapped in scrollable container
- All form field markup preserved unchanged

**Bonus fix — `NotificationSettings` + `NotificationsPanel` backdrops:**
Changed `bg-black/30` → `rgba(23,20,15,0.45)` + `backdropFilter: blur(4px)` (these are small panels, not full forms, so kept their custom layout but unified the backdrop).

**Result:** Zero `bg-black/` backdrops remain in any app component. All modals share consistent backdrop, scroll behavior, and keyboard accessibility.

---

## Expense Type Dropdown Fix (June 28, 2026)

### Issue: Expense form "Type" field was static text, not a dropdown

**Root cause:** The COGS/OPEX classification was displayed as a plain `<p>` tag showing "COGS" or "OPEX" with no way to manually override. While the category auto-sets the default (`materials`/`stones`/`findings`/`packaging`/`labor` → COGS; others → OPEX), users had no way to change it if the auto-detection was wrong (e.g., "Shipping" might be COGS for a specific project).

**Fix:** Converted the static text to a `<select>` dropdown with two options:
- `COGS — Cost of Goods Sold`
- `OPEX — Operating Expense`

The `cogsManuallySet` ref (already present in the component) now tracks manual overrides. Auto-default from category still works on category change unless the user has manually toggled the type.

**File:** `src/app/components/ExpensesPage.tsx`

---

## QuotesPage Pricing Calculator Check (June 28, 2026)

### Status: ✅ Integrated

The pricing calculator (`QuotePricingPanel`) is embedded in `QuotesPage.tsx` as the editable pricing editor for quotes. It renders when the quote is editable (not locked), replaces "Piece or service" free-text with `PiecePicker`, shows piece retail as benchmark beside computed price, and saves versioned pricing snapshots to the quote. Locked quotes show a read-only snapshot via `DocumentCanvas`. Decision refs: D14, D22, D28, D29, D30, D31 from the multi-agent build plan.

### Issue: Pricing panel not visible — quote detail API broken (June 28, 2026)

**Root cause:** `functions/api/quotes/[quoteId].ts` GET handler still used the broken
`db.select({ specific }).from(quotes).leftJoin(clients).leftJoin(projects)` pattern that
triggers the Drizzle Cloudflare Workers bundler bug (`TypeError: Cannot convert undefined
or null to object`). The quote detail API silently failed, so `detail` was never populated
on the frontend, and the pricing panel (`isEditable ? <QuotePricingPanel> : ...`) never
rendered because there was no `detail.status` to evaluate.

**Fix:** Replaced with the safe `db.select().from(quotes).leftJoin(...)` + manual mapping pattern:
```ts
const rows = await db.select().from(quotes)
  .leftJoin(clients, eq(quotes.clientId, clients.id))
  .leftJoin(projects, eq(quotes.projectId, projects.id))
  .where(eq(quotes.id, quoteId));

const row = rows[0];
const record = row ? {
  id: row.quotes.id,
  clientName: row.clients?.name ?? null,
  projectTitle: row.projects?.title ?? null,
  // ... etc
} : null;
```

**File:** `functions/api/quotes/[quoteId].ts`

**Verification:** Quote detail API now returns `{ quoteNumber, clientName, status, versions, activity }`. Quote Q-0002 (Gayle Belvis, draft) confirmed returning with `versions: []` and `activity: [1]`. The pricing panel renders for draft/sent/viewed quotes with default cost lines when no versions exist yet.

---

## Drizzle Workers Bundler — Remaining Survivors (June 28, 2026)

### Issue: 5 additional API endpoints still had the broken `db.select({...}).join()` pattern

After the initial wave of 17 fixes (documented above), a detailed sweep found 5 more endpoints
that were missed — all activity/revision queries joining `appUsers` or `clients`, plus one
nonexistent column reference (`quotes.totalCents` doesn't exist on the schema).

**Root cause:** The initial fix wave targeted the main data queries but missed activity-log
queries and secondary join queries (revisions, related entities). All followed the same
broken pattern: `db.select({ specific: table.column }).from(table).leftJoin/innerJoin(...)`.

**Files fixed:**

| File | Broken queries | Fix |
|------|---------------|-----|
| `clients/[clientId].ts` | Activity query `.innerJoin(appUsers)`, finance query `.leftJoin(payments)`, nonexistent `quotes.totalCents` column | `db.select()` + `.map()`, split finance into two simple queries, removed `totalCents` |
| `catalog/[pieceId].ts` | Activity query `.innerJoin(appUsers)`, projects query `.innerJoin(clients)`, certificates query `.leftJoin(clients)`, repairs query `.leftJoin(clients)`, soldData query `.innerJoin(inventoryLots)` | `db.select()` + `.map()` for all five, soldData moved out of `Promise.all` (needed `linkedStock` lot IDs) |
| `repairs/[ticketId].ts` | Activity query `.leftJoin(appUsers)` | `db.select()` + `.map()` |
| `certificates/[certId].ts` | Activity query `.leftJoin(appUsers)`, revisions query `.leftJoin(appUsers)` | `db.select()` + `.map()` for both |
| `inventory/[lotId].ts` | Activity query `.innerJoin(appUsers)` | `db.select()` + `.map()` |

**Verification:**
- Zero `db.select({...}).join()` patterns remain across all 29 API files (confirmed with automated sweep)
- Client detail: returns `{ client, activity, finance: { lifetimeSpend, balanceDue }, related: { projects, quotes, invoices, repairs, certificates } }`
- Catalog piece detail: returns linked projects, stock, certificates, repairs with client names
- All TypeScript compiles clean

---

## QuotePricingPanel Stale State After Save (June 28, 2026)

### Issue: Quote pricing can only be edited once — unclickable after first save

**Root cause:** `QuotePricingPanel` initializes all form state via `useState(restored?.lines ?? DEFAULT_LINES)`. `useState` only reads the initial value on first mount. After saving a version, `onVersionSaved` triggers `fetchDetail` which reloads the quote detail with a new `existingSnapshot`. The `restored` useMemo recomputes, but the `useState` hooks do **not** re-initialize — they keep the old internal state. This mismatch between the new snapshot prop and the stale form state made the panel unresponsive after the first save.

**Fix:** Added `key={detail.versions?.length ?? 0}` to `<QuotePricingPanel>` in `QuotesPage.tsx`. Each save increments the version count, which changes the key, which forces React to unmount the old component and mount a fresh one with state correctly initialized from the latest `existingSnapshot`.

- Version 0 (no saves): `key=0` → initialized from `DEFAULT_LINES`
- After first save: `key=1` → fresh mount, initialized from saved snapshot
- After second save: `key=2` → fresh mount, initialized from latest snapshot
- And so on

**File:** `src/app/components/QuotesPage.tsx`

**Verification:** Two test versions saved via API (v1, v2), quote detail returns both versions, component remounts cleanly on each save.

---

## Dead Pricing-Calculator Island Removed (June 28, 2026)

### Issue: Standalone pricing calculator + `/pricing` store left orphaned after D28

The pricing flow was folded into the quote (`QuotePricingPanel`, decision D28), but the
old standalone calculator and its separate version store were never deleted. An audit
found them orphaned — `PricingCalculator.tsx` was imported nowhere, yet it (and only it)
still called a **live authenticated `/pricing` API**. Tree-shaken from the bundle, so no
runtime bug, but redundant source + an unused server surface (the exact duplication D28
set out to retire).

**Removed (verified no remaining importers first):**
- `src/app/components/PricingCalculator.tsx`
- `src/app/pricingHistory.ts` + `src/app/pricingHistory.test.ts`
- `functions/api/pricing/index.ts`, `functions/api/pricing/[calculationId]/versions.ts`
- `src/server/pricing/input.ts`

**Kept (still live):** `src/app/pricing.ts` (the math module, used by `QuotePricingPanel`)
and `src/app/pricing.test.ts`.

**Verification:** `tsc` clean, `build:api` green, 28/28 tests pass.

---

## MasterDetail Mobile Re-Entry Bug — `onBack` Missing (June 28, 2026)

### Issue: Can't re-open detail after closing — same item unclickable second time

**Root cause:** `MasterDetail` uses a rising-edge detector on `hasSelection` to switch
mobile view from list→detail. Each page with `MasterDetail` has a `selectedId` state.
When the user taps "Back to list" on mobile, `MasterDetail`'s internal `handleBack` sets
`mobileView` to `"list"` — but `selectedId` was never cleared, so `hasSelection` stayed
`true`. Clicking the same item again called `setSelectedId(sameId)`, which React discards
(same value = no re-render). `hasSelection` never transitioned `false→true`, so the
rising-edge detector in `MasterDetail` never fired, and the detail view never re-appeared.

This affected every entity type on mobile: quotes, certificates, expenses, invoices, repairs.

**Fix:** Added `onBack={() => setSelectedId(null)}` to every `MasterDetail` usage. Now
when the user taps "Back to list", `selectedId` clears → `hasSelection` goes false. The
next tap on any item (including the same one) triggers a clean `false→true` transition,
re-opening the detail view.

**Pages fixed:**
| Page | Status |
|------|--------|
| `CatalogPage` | Already had `onBack` ✅ |
| `QuotesPage` | Added ✅ |
| `CertificatesPage` | Added ✅ |
| `ExpensesPage` | Added ✅ |
| `InvoicesPage` | Added ✅ |
| `RepairsPage` | Added ✅ |

**Verification:** Browser-tested on mobile viewport: back→same item works repeatedly.

---

## TypeScript Compile Errors Fixed Before Deploy (June 28, 2026)

### Issue: 11 type errors across 7 functions/ files blocking `npm run deploy`

After deleting `src/server/pricing/input.ts` (Dead Pricing-Calculator Island cleanup),
several type errors surfaced across the functions API layer:

| File | Error | Fix |
|------|-------|-----|
| `functions/api/certificates/index.ts` | `crojectId` / `pertificateNumber` typos | → `projectId` / `certificateNumber` |
| `functions/api/replies/index.ts` | Import from deleted `pricing/input` | → new `src/server/replies/input.ts` |
| `functions/api/replies/[templateId]/versions.ts` | Import from deleted `pricing/input` | → new `src/server/replies/input.ts` |
| `functions/api/events/[eventId].ts` | `clients.displayName` doesn't exist | → `clients.name` |
| `functions/api/projects/[projectId].ts` | `quotes.totalCents` doesn't exist | → join `pricingVersions.suggestedPriceCents` |
| `functions/api/catalog/[pieceId].ts` | `stockMovements.lotId` → `inventoryLotId`; `clients.displayName` → `clients.name` | 4 fixes |
| `functions/api/quotes/convert.ts` | `PagesFunction<Env>` type mismatch with `@cloudflare/workers-types` | Removed explicit type annotation, used inline `{ request: Request; env: Env }` |

**New file created:** `src/server/replies/input.ts` — extracted `createReplyTemplateInput`
and `createReplyTemplateVersionInput` from the deleted `pricing/input`. These are reply
template types, not pricing types, and belong in their own domain module.

**Verification:** `tsc --noEmit` clean, `tsc --project functions/tsconfig.json` clean.
