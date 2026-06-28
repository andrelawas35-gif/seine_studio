# Post-Deployment Delivery Plan — Engineer Breakdown

How the post-deployment fixes and feature builds are divided across engineers,
who owns which files, and the order the Controller releases work in. The goal:
**no two engineers edit the same file at the same time.** Where parallel work is
safe (disjoint files, read-only, or independent new files), it is explicitly
allowed.

Source of truth for *what* and *why*:
- `CONTEXT.md` — domain glossary (binding vocabulary)
- `docs/adr/0003-tunable-settings-not-equation-editing.md`
- `docs/adr/0004-consignment-as-distinct-entity.md`
- `docs/adr/0005-project-owned-by-event-xor-client.md`
- `docs/post-deployment-fixes.md` — diagnosed bugs + fixes
- `project.md` — full design doc

Every engineer reads `CLAUDE.md` (hard constraints) and `CONTEXT.md` before
touching code, and uses glossary terms verbatim.

## Quick-reference index

- **Controller sequencing & merge order:** `docs/agents/controller-sequencing.md`
- **Engineer briefs:**
  - E1 Shell/Auth — `docs/agents/brief-e1-shell-auth.md`
  - E2 Forms/UI — `docs/agents/brief-e2-forms-ui.md`
  - E3 Pricing — `docs/agents/brief-e3-pricing.md`
  - E4 Data/Schema — `docs/agents/brief-e4-schema.md`
  - E5 Settings — `docs/agents/brief-e5-settings.md`
  - E6 Events — `docs/agents/brief-e6-events.md`
  - E7 Projects — `docs/agents/brief-e7-projects.md`
  - E8 Consignment — `docs/agents/brief-e8-consignment.md`
  - E9 Audit — `docs/agents/brief-e9-audit.md`
- **Hand-off contracts:**
  - E5↔E3 Catalog API — `docs/agents/handoff-e5-e3-catalog-api.md`
  - E6↔E7 Event Stock — `docs/agents/handoff-e6-e7-event-stock.md`
  - E6→E1 Nav Spec — `docs/agents/handoff-e6-e1-nav.md`

---

## File-ownership map (the anti-collision contract)

| File / area | Sole owner | Notes |
|---|---|---|
| `src/app/App.tsx`, `src/app/auth.ts`, `src/app/api.ts` | **E1 Shell/Auth** | Only E1 edits the app shell + auth client |
| `src/app/notifications.ts`, `src/app/sw.ts` | **E1 Shell/Auth** | VAPID + service worker |
| `src/app/components/CertificatesPage.tsx`, `RepairsPage.tsx`, `Modal.tsx` | **E2 Forms/UI** | Modal scroll polish |
| `src/app/pricing.ts`, `src/app/components/PricingCalculator.tsx` | **E3 Pricing** | Cost types, catalog wiring, event-pricing mode |
| `src/server/db/schema.ts`, `drizzle/*` | **E4 Data/Schema** | **Single migration author.** No one else writes migrations |
| Settings page + `functions/api/settings/*`, `functions/api/cost-catalog/*` | **E5 Settings** | New files only |
| `src/app/components/EventsPage.tsx`, home calendar widget, `functions/api/events/*` | **E6 Events** | Home widget lives in OverviewPage, NOT App.tsx |
| `src/app/components/ProjectsPage.tsx`, `functions/api/projects/*` | **E7 Projects** | |
| `ConsignmentPage.tsx` (new) + `functions/api/consignment/*` (new) | **E8 Consignment** | All-new files |
| `docs/agents/search-audit.md`, `docs/agents/db-audit.md` (new) | **E9 Audit** | Read-only on code; writes findings docs |

**Two hard serialization points:** `schema.ts` (E4 only) and `App.tsx` (E1 only).
All feature engineers (E5–E8) depend on E4's migrations landing first.

---

## The Controller (Orchestrator)

One agent coordinates all engineers. It does **not** write feature code; it
integrates, sequences, and guards the contract above.

Responsibilities:
- Release work in the waves below; never unblock a downstream engineer before its
  schema dependency has merged.
- Own the merge order. Resolve any cross-file conflict by deciding who rebases.
- Keep the enum strings consistent across E3 (code) and E4 (DB) — the jewelry
  cost-type values must match exactly.
- Run the final integration pass on `App.tsx` if E6's home calendar widget needs
  a route/nav entry (E1 makes that one edit; E6 hands over a spec).
- Verify each merged item in preview before closing it.
- Keep `docs/post-deployment-fixes.md` and the ADRs updated as reality changes.

Docs the Controller owns: `docs/agents/delivery-plan.md` (this file),
`docs/post-deployment-fixes.md`, `CONTEXT.md`, `docs/adr/*`.

---

## Wave 1 — Phase A contained fixes + audits (all parallel, fully safe)

These touch disjoint files; run simultaneously.

### E1 — Shell & Auth Engineer
**Description:** Owns the app shell, auth client, and PWA plumbing. Highest-blast-radius
files, so isolated to one engineer.
**Tasks:**
- VAPID: regenerate keypair; put raw base64url public key in `notifications.ts`;
  store private key as a Cloudflare secret; fix misleading error suffix (line ~54).
- Auth bounce: in `App.tsx` (~line 414), only sign out on real `403` or a `401`
  that survives one token-refresh retry; never on network/5xx/expired-token. Add
  the token-refresh-and-retry path in `api.ts`/`auth.ts`.
- Scroll wall: in `App.tsx`, give mobile a single dedicated scroll container,
  add `overscroll-behavior-y: contain`, reconcile `env(safe-area)` + `pb-28`.
**Docs:** `docs/post-deployment-fixes.md` (update statuses to Fixed). Verify in preview.

### E2 — Forms & UI Polish Engineer
**Description:** Mobile form fit-and-finish. Disjoint from E1.
**Tasks:**
- Make cert & repair modal forms scrollable: scrolling body, fixed header/actions,
  capped max-height. Verify on a mobile viewport.
**Docs:** none new; note the fix in `docs/post-deployment-fixes.md` via the Controller.

### E3 — Pricing Engineer (Wave 1 slice)
**Description:** Owns the pricing model end-to-end.
**Tasks (Wave 1):**
- Add jewelry cost types to `pricing.ts` enum + `CATEGORY_LABEL`:
  `stones_gemstones`, `metal_findings`, `finishing_plating`, `setting_engraving`.
  Coordinate exact strings with E4. Additive only (ADR-0003).
**Docs:** `CONTEXT.md` cost-type list already updated; confirm parity.

### E9 — Audit / Investigation Engineer (read-only)
**Description:** Investigates, never edits code. Fully parallel, zero collision risk.
**Tasks:**
- Search audit: run API mode, test all 10 list pages' search; classify each as
  empty-data / fixtures / real bug. Recommend whether to add a global search.
- DB relational + data-flow audit across all 27 tables: orphaned/unused tables,
  FKs not surfaced in UI, missing cross-navigation, derive-wiring gaps.
**Docs (new):** `docs/agents/search-audit.md`, `docs/agents/db-audit.md`.

---

## Wave 2 — Schema foundation (single engineer, serialized)

### E4 — Data / Schema Engineer
**Description:** The **only** author of `schema.ts` and Drizzle migrations. Everything
in Wave 3 waits on this.
**Tasks (one ordered migration set):**
- `settings` (key/value tunable parameters) + `cost_catalog` (cost line, fixed
  cost-type enum incl. the 4 jewelry types — match E3's strings).
- `event_price_list` (event_id, product, price).
- `consignment` + `consignment_count` tables.
- `projects.event_id` + CHECK (exactly one of client_id / event_id non-null).
- Apply via Neon SQL API (drizzle-kit migrate needs TTY — see fixes doc).
**Docs:** `docs/post-deployment-fixes.md` (migration log); ADR-0003/0004/0005 are
the spec it implements.

---

## Wave 3 — Feature builds (parallel; each owns disjoint files)

All depend on E4 having merged. Within the wave they do not share files.

### E5 — Settings & Customization Engineer
**Description:** Builds the audited Settings surface and cost-catalog management.
**Tasks:** Settings page (Owner+Developer, writes `activity_events`); API routes for
settings + cost-catalog CRUD; wire PricingCalculator's suggestions to read the
catalog via E3's hand-off interface (E5 builds API; E3 consumes it).
**Docs:** ADR-0003. New: `functions/api/settings/`, `functions/api/cost-catalog/`.

### E3 — Pricing Engineer (Wave 3 slice)
**Tasks:** Replace hardcoded `DEFAULT_LINES`/tracker constants with catalog data
from E5's API; add **event-pricing mode** writing to `event_price_list`; snapshot
parameter values into saved calculations (ADR-0003).
**Files:** `pricing.ts`, `PricingCalculator.tsx` (still E3-exclusive).

### E6 — Events & Calendar Engineer
**Description:** Events rework + calendar surfaces.
**Tasks:** Calendar + summary list front; tap-to-expand detail/edit (display-case
metaphor); compact calendar widget on the home/Overview screen; per-event price
list UI with placeholder linking to the pricing calculator when empty. If a nav
route is needed, hand E1 a one-line spec (E1 makes the App.tsx edit).
**Files:** `EventsPage.tsx`, Overview widget, `functions/api/events/*`.

### E7 — Projects Engineer
**Description:** New project form + ownership model.
**Tasks:** Material/labor/cost-line picker building an **estimate-only** cost sheet
(no stock movements — ADR-0005/CONTEXT); owner = event XOR client (form + rely on
E4's CHECK); event-owned projects feed the event stock list (coordinate the
contract with E6).
**Files:** `ProjectsPage.tsx`, `functions/api/projects/*`.

### E8 — Consignment Engineer
**Description:** New consignment feature (all-new files, lowest collision risk).
**Tasks:** Consignment page (partner shop, no dates) + monthly consignment counts;
reuse the stock-allocation concept; separate from events (ADR-0004).
**Files (new):** `ConsignmentPage.tsx`, `functions/api/consignment/*`.

---

## Parallelism summary

- **Safe parallel (Wave 1):** E1 ∥ E2 ∥ E3-slice ∥ E9 — disjoint files / read-only.
- **Serialized (Wave 2):** E4 alone owns schema; gates Wave 3.
- **Safe parallel (Wave 3):** E5 ∥ E3-slice ∥ E6 ∥ E7 ∥ E8 — disjoint files; two
  cross-engineer *contracts* (E5↔E3 catalog API, E6↔E7 event-stock list) handled
  by hand-off specs, not shared edits.
- **Only shared-file touch outside an owner:** E6 → E1 for a nav route, done as a
  single E1 edit from E6's spec. The Controller enforces this.
