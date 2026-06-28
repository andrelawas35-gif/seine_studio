# E1 — Shell & Auth Engineer

## Files owned (exclusive — no one else edits these)

| File | Purpose |
|------|---------|
| `src/app/App.tsx` | App shell, routing, layout, sidebar, mobile nav, auth gate |
| `src/app/auth.ts` | Auth client: session, sign-in/up/out, token exchange |
| `src/app/api.ts` | API request wrapper with auth token injection |
| `src/app/notifications.ts` | Push notification helpers, VAPID, daily reminder logic |
| `src/sw.ts` | Service worker: push handler, notification click, daily reminder scheduler |

## Required reading (before touching code)

1. `CLAUDE.md` — hard constraints (design system, interaction, data rules, security, PWA)
2. `CONTEXT.md` — domain glossary (use terms verbatim)
3. `docs/post-deployment-fixes.md` — diagnosed bugs (auth bounce, scroll wall, VAPID)
4. `docs/agents/domain.md` — how to consume domain docs

## Wave 1 Tasks

### 1. VAPID keypair regeneration

- **File:** `src/app/notifications.ts`
- Generate a fresh VAPID keypair. Put the raw base64url **public** key in `notifications.ts` (replace the current `VAPID_PUBLIC_KEY` constant).
- Store the **private** key as a Cloudflare Pages secret (`VAPID_PRIVATE_KEY`).
- Fix the misleading error suffix on line ~54 (the current message implies the app must be installed when the real cause may be different).

### 2. Auth-bounce fix

- **Files:** `src/app/App.tsx`, `src/app/auth.ts`, `src/app/api.ts`
- **Problem:** App.tsx signs out on any fetch error, including network blips and 5xx.
- **Fix:**
  - In `api.ts`: add a token-refresh-and-retry path. If an API call returns 401, attempt to refresh the token via `/token`, then retry the request once.
  - In `App.tsx`: only sign out on a real `403` or a `401` that survives the token-refresh retry. Never sign out on network errors or 5xx.
  - The sign-out path must remain in the auth gate (around the `/api/me` call).

### 3. Scroll wall

- **File:** `src/app/App.tsx`
- Give mobile a single dedicated scroll container.
- Add `overscroll-behavior-y: contain` to prevent pull-to-refresh fighting.
- Reconcile `env(safe-area)` insets with the `pb-28` bottom nav padding — ensure no content is hidden behind the mobile nav bar or notch.

## Acceptance criteria
- VAPID public key replaced, private key stored as Cloudflare secret
- Sign-in does not bounce on transient network errors
- Mobile scroll is contained; no content overlaps safe areas or bottom nav
- Verify in preview on mobile viewport

## Merge constraints
- E1 merges first in Wave 1 (no one else touches App.tsx or auth)
- If E6 needs a nav route added to App.tsx, E6 hands E1 a one-line spec; E1 makes the single edit
