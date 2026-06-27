## Agent skills

### Issue tracker

GitHub Issues on `andrelawas35-gif/seine_studio`, PRs not treated as a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Project rules

Full design doc and architecture decisions are in `project.md`. Read it before major feature work. The hard constraints every agent must follow:

### Design system

- **French Minimal / Louvre-inspired.** Generous whitespace, measured proportions, warm off-white canvas (`#F0EBE0`). Never a cold gray shell.
- **Colors:** Canvas `#F0EBE0`, Surface `#FAF7F0`, Primary `#17140F`, Gold accent `#B8975A`, Muted `#7A6F5E`. Prefer semantic CSS variables over hex values.
- **Typography:** Playfair Display (display), DM Sans (interface), DM Mono (numbers/IDs). Base radius `0.25rem`.
- **Gold is a single sparing accent** — never a general-purpose status color. Use restrained red, amber, green, blue, or violet for status.
- **Display case metaphor.** Each panel is curated, not crammed. Hairline borders, disciplined alignment, shallow radii.
- **No faux-French ornament** — no marble textures, heavy shadows, ornamental frames.

### Interaction

- One clear primary action per page with descriptive labels (`Create quote`, not `New`).
- Touch-first — no hover-dependent essential actions. 44×44px minimum touch targets.
- Mobile is first-class. Desktop shows more context but no core workflow may require desktop.
- Respect `prefers-reduced-motion`. Motion clarifies state, never decorates.
- Every form: labels, validation, empty states, explicit success/error. Color alone never communicates status.

### Data rules

- Manila by default: Philippine pesos, `Asia/Manila` timezone, Philippine address/contact conventions.
- Revenue, balances, inventory value, cost, margin, profit are **derived from source records**, never manually duplicated.
- Stock movements are append-only and immutable. On-hand quantity is derived, never stored.
- Important changes, payments, handoffs, and status transitions must be dated and attributable.

### Security

- Never expose `DATABASE_URL` in the browser or `VITE_*` prefixed variables.
- Two-email allowlist enforced on the server (`OWNER_EMAIL`, `DEVELOPER_EMAIL`). Public registration disabled.
- Both `VITE_NEON_AUTH_URL` (client) and `NEON_AUTH_URL` (server) = the Neon Auth base URL **with** `/neondb/auth`. Better Auth REST routes are relative to it (`/sign-in/email`, `/sign-up/email`, `/get-session`, `/token`, `/sign-out`); JWKS is at `{url}/.well-known/jwks.json`. Do **not** use a root-domain `/api/auth/...` form — the proxy reads the first path segment as the database name and it 404s. See `docs/post-deployment-fixes.md`.

### PWA

- `registerType: prompt` — never auto-update and discard drafts.
- Never mark invoices paid, finalize financials, issue certificates, or decrement stock offline without server confirmation.
- Never resolve write conflicts by last-write-wins for prices, payments, inventory, certificates, or custody events.

### Tech stack

React 18, TypeScript, Vite, Tailwind CSS 4, Drizzle ORM, Neon Postgres, Cloudflare Pages Functions, PWA via `vite-plugin-pwa`. Node.js ≥22. `npm run deploy` = build:api + wrangler pages deploy. `npm run dev` = fixtures mode; `npm run dev:full` = API mode.
