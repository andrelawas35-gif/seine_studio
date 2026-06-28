# 0005 — UI workflow and information architecture

- Status: Accepted
- Date: 2026-06-28
- Deciders: Owner, Developer (grilling session)
- Amends: [ADR 0004](0004-master-detail-primitive.md) (MasterDetail selection moves
  from component state to route params — see D-UI-8)

## Context

The app shipped 13 top-level pages with a flat sidebar, a 9-item mobile "More"
drawer, a project-centric Overview, and per-page detail patterns that diverged:
five pages route detail by URL (`/projects/:id`) while five trap the selected
record in component state. A painted-on TopBar search input had no handler; the
`command.tsx` palette primitive sat unused. The money chain (quote → project →
invoice → payment) relayed across pages, stranding the user with a toast after
billing. Three different invoice-creation paths existed with no shared model, and
a walk-in sale silently skipped stock-out. Forms rendered as centered scale-up
dialogs with no mobile branch, fighting the "mobile is first-class" principle.
Detail pages under-delivered the "one connected history" product principle.

This ADR records a coherent pass over **UI, workflow, and organization**. The
load-bearing decision is D-UI-8: once every record has a URL, the command palette,
actionable toasts, and connected-history "view all" links all become possible.

## Decisions

### Navigation & information architecture

- **D-UI-1 — Mobile bottom nav stays Overview · Projects · Catalog · Clients.**
  The daily four. Quotes is frequent but lives in the grouped drawer, not the nav.
- **D-UI-2 — The mobile "More" drawer is grouped**, not a flat list of 9:
  **Sales** (Quotes, Invoices, Events) · **Operations** (Inventory, Expenses,
  Repairs) · **Records** (Accounting, Certificates, Reply Templates), with eyebrow
  section headers, ordered by workflow sequence.
- **D-UI-5 — The desktop sidebar mirrors the mobile structure**: the four primary
  destinations ungrouped at top, then hairline-separated **Sales / Operations /
  Records** sections with eyebrow labels. Both surfaces teach the same model.

### Overview as a daily briefing

- **D-UI-3 — The Overview is restructured into a daily briefing.** Metric cards:
  Active Projects · Pending Quotes · Unpaid Invoices · Overdue. Add a prioritized
  **Needs Attention** list (overdue projects, expiring quotes, past-due invoices,
  past-promise repairs, low stock — each row links to the record). Keep the
  Calendar and Project Pipeline; slim Upcoming Events to 3. Drop Recent Projects
  (duplicates the Projects page) and the Total Clients vanity metric.
- **D-UI-4 — Urgency is computed in a shared selector module** (`src/app/signals.ts`)
  of pure functions — `overdueInvoices`, `expiringQuotes`, `lowStock`, etc. The
  Overview composes them; individual pages reuse the same definition. Honors
  "calculated truth" with a single source of each calculation. Accept the wider
  Overview fetch fan-out for now; a server `/api/overview` that wraps the same
  selectors is a future optimization.

### Workflow continuity

- **D-UI-6 — Workflow actions end with an actionable toast offering the next step**
  (`Invoice INV-0012 created · View →`), not a dead-end toast and not forced
  navigation. Threads quote → project → invoice → payment while preserving "stay
  where you are." Convert-to-project keeps its existing forward navigation.
- **D-UI-7 — The TopBar search becomes a real global command palette** (⌘K, or
  tap-to-fullscreen on mobile), backed by the unused `command.tsx` and a new
  `/api/search?q=` endpoint doing `ILIKE` across clients, projects, quotes,
  invoices, pieces, repairs. Results group by type and navigate to the record.
  If not built this phase, the dead input is removed — a painted-on box that does
  nothing erodes trust.

### The load-bearing routing decision

- **D-UI-8 — Every list entity uses URL-routed detail.** Quotes, Invoices,
  Expenses, Repairs, Certificates get the same `/:id?` route pattern the other
  five already use. `master-detail.tsx` stays as the *visual* two-pane layout but
  reads the selected ID from `useParams`, not `useState` (this amends ADR 0004).
  Prerequisite for D-UI-6 (toasts have somewhere to link), D-UI-7 (palette has
  somewhere to navigate), D-UI-13 ("view all" deep links), and a working browser
  back button on mobile.

### The money model

- **D-UI-9 — Three coherent money entry points, one job each:**
  1. *Commission* → **Bill from project** (deposit/balance, inherits from accepted
     quote, no stock — COGS derives from allocation).
  2. *Selling a finished piece* (walk-in or event) → **Record sale**: one atomic
     action creating invoice + stock-out movement + payment. Event is optional
     (`eventId` set at an event, absent for walk-in). Requires on-hand stock.
  3. *Anything else* → **Create invoice**: a bare demand for payment that never
     touches stock (services, misc bills).
  This closes the silent stock-leak where a standalone invoice sold a piece without
  decrementing inventory.
- **D-UI-10 — "Record sale" has three doorways, one component.** Primary on the
  catalog piece detail ("Sell this piece" — it already shows finished-piece stock),
  secondary on the finished-piece batch in Inventory, plus the existing Events
  entry. All open the same flow with the piece (and optionally event) pre-filled.

### Form container & action consistency

- **D-UI-11 — `Modal.tsx` becomes one responsive container**: centered dialog
  ≥md, full-height bottom sheet <md with a sticky, safe-area-aware footer holding
  the actions above the on-screen keyboard. One change fixes all ~11 create/edit
  forms. Multi-step mobile flows (`Client → Items → Payment → Review`) deferred.
- **D-UI-12 — One filled primary action per list page**, labeled `verb + noun`
  with the domain-true verb, identical across desktop header / mobile action /
  empty-state CTA. Canonical set: Create project · Add client · Create quote ·
  Create invoice · Log expense · Receive batch · Add piece · Log repair · Create
  event · Issue certificate. Every bare "New" retired; secondary actions (Record
  payment, Record sale, Bill deposit) stay outlined and subordinate.

### Connected history

- **D-UI-13 — A connected-history contract brings Client and Project detail up to
  the piece-360 standard**, all derived from source records:
  - **Client**: lifetime value (Σ payments) · open balance (Σ invoice balances) ·
    projects · quotes · invoices · certificates · repairs · activity timeline.
  - **Project**: originating quote · invoices · payments · certificate · finance
    block (existing) · activity.
  - **Piece**: already the reference standard — unchanged.
  Lifetime value and balances are always derived, never a stored `totalSpent`.
  Each linked section shows a count + the most recent few + a "view all" that
  filters the now-routable list page. Extend the existing detail endpoints to embed
  compact linked-record summaries rather than fan out many round-trips.

## Consequences

- **D-UI-8 is sequenced first** — it unblocks the palette, toasts, and "view all"
  links. The five master-detail pages get a one-time refactor lifting selection
  into the router; the pattern is already proven in the other five.
- New backend surface: `/api/search` (D-UI-7); embedded linked-record summaries on
  `/api/clients/:id` and `/api/projects/:id` (D-UI-13). Both are modest for a
  two-user studio; no new infra.
- `src/app/signals.ts` becomes the single home for urgency/derived-status logic,
  reused by the Overview and the individual pages (D-UI-4).
- `Record sale` is promoted to a shared component used by Events, Catalog, and
  Inventory (D-UI-9/10).
- `Modal.tsx` gains a responsive branch; no call sites change (D-UI-11).

## Alternatives considered

- **Keep the master-detail/URL split and scope the palette + toasts to URL-routed
  entities only** — rejected: bakes in a permanent two-class system where some
  records are addressable and some aren't, shipping the palette and toasts
  half-working.
- **A server `/api/overview` endpoint to collapse the dashboard to one call** —
  deferred, not rejected: client-side selectors keep the calculation colocated with
  the types and avoid new surface while on the free tier; the endpoint can later
  wrap the same selectors if mobile first-paint demands it.
- **Forced forward-navigation after billing** — rejected in favor of actionable
  toasts (D-UI-6), which thread the workflow without yanking the user off the page
  when they want to bill deposit and balance back-to-back.
- **Swap every Modal call site to the `Sheet` primitive** — rejected: evolving
  `Modal.tsx` fixes 11 pages in one place without touching call sites.
