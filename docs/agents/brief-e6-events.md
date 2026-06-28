# E6 — Events & Calendar Engineer

## Files owned (exclusive — no one else edits these)

| File / Area | Purpose |
|-------------|---------|
| `src/app/components/EventsPage.tsx` | Events list, detail, create/edit |
| `src/app/pages/CorePages.tsx` — Overview home widget | Calendar/summary widget on home screen |
| `functions/api/events/` (new) | Events API routes |

## Required reading (before touching code)

1. `CLAUDE.md` — design system, interaction rules, data rules
2. `CONTEXT.md` — **Event**, **Event price list**, **Stock movement**, **Allocation**, **Studio buffer** definitions
3. `docs/adr/0004-consignment-as-distinct-entity.md` — events are temporary, consignment is long-lived
4. `docs/adr/0005-project-owned-by-event-xor-client.md` — event-owned projects populate event stock list
5. `docs/agents/handoff-e6-e7-event-stock.md` — E6↔E7 event-stock contract
6. `docs/agents/domain.md` — how to consume docs

## Wave 3 Tasks (after E4 merges schema)

### 1. Events page rework

- **File:** `src/app/components/EventsPage.tsx`
- Calendar + summary list front (the user chooses calendar or list view).
- Tap-to-expand detail/edit panels following the **display-case metaphor**: generous whitespace, one clear focus per section.
- Sections: Overview, Stock Pull, Checklist, Budget, Sales, Reconciliation — one primary action per stage.
- Use the existing event lifecycle: `Draft → Planning → Packing → Ready → Active → Reconciliation → Closed` (+ `Cancelled` as side state).

### 2. Home calendar widget

- **File:** `src/app/pages/CorePages.tsx` — inside `OverviewPage`
- A compact upcoming-events / calendar summary widget on the Overview (home) screen.
- Shows next 3–5 upcoming events with date, stage pill, and stock-pull readiness indicator.
- **Deliberately lives in OverviewPage, NOT App.tsx** — E6 never touches the shell.

### 3. Per-event price list UI

- Within each event detail, show the event's price list (`event_price_list` table from E4).
- If empty: show a placeholder linking to the pricing calculator (`/accounting` → Pricing tab).
- If populated: show {piece name, event price} rows.
- Event prices are independent of regular pricing — an item with no event price is NOT sold at the regular price by default.

### 4. Events API routes

- **Files:** `functions/api/events/` (new)
- `GET /api/events` — list events, filterable by stage
- `GET /api/events/:id` — single event with allocations, tasks, budget lines
- `POST /api/events` — create event
- `PUT /api/events/:id` — update event
- Stock pull / allocation endpoints as needed
- Auth: verify JWT

## Cross-engineer contract: E6 ↔ E7

- **Read:** `docs/agents/handoff-e6-e7-event-stock.md`
- E7 builds the project-to-event wiring. E6 displays event-owned projects in the event stock list.
- E7's event-owned projects (from `ProjectsPage.tsx`) must be readable by E6's event detail view.
- Contract: E7 exposes a list of projects keyed by `event_id`; E6 reads it.
- Neither edits the other's files.

## Nav route hand-off (E6 → E1)

If the calendar widget or event rework needs a new nav entry or route change in `App.tsx`:
- E6 writes a **one-line spec** in `docs/agents/handoff-e6-e1-nav.md` describing the needed change.
- **E1 makes the App.tsx edit.** E6 never touches `App.tsx`.
- This is the only shared-file touch in the entire plan, and it's a one-line serialized edit by the sole App.tsx owner.

## Design constraints
- Display-case metaphor: each panel is curated, not crammed
- Calendar uses museum gold sparingly (event date highlights, not general status)
- Touch-first: expand/collapse with tap, not hover
- Mobile bottom nav: Events lives under "More" (5-destination limit)

## Acceptance criteria
- Events page shows calendar or list view with tap-to-expand detail
- Home screen shows compact upcoming-events widget (inside OverviewPage)
- Per-event price list shows event-specific prices with placeholder for empty state
- API routes handle CRUD for events
- No edits to App.tsx (nav change handed to E1 if needed)
