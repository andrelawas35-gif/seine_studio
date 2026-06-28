# E7 — Projects Engineer

## Files owned (exclusive — no one else edits these)

| File / Area | Purpose |
|-------------|---------|
| `src/app/components/ProjectsPage.tsx` | Projects list, detail, create/edit |
| `functions/api/projects/` (new) | Projects API routes |

## Required reading (before touching code)

1. `CLAUDE.md` — design system, interaction rules, data rules
2. `CONTEXT.md` — **Project**, **Project stage**, **Project cost estimate**, **Stock movement** definitions
3. `docs/adr/0005-project-owned-by-event-xor-client.md` — XOR ownership enforced at DB level
4. `docs/agents/handoff-e6-e7-event-stock.md` — E6↔E7 event-stock contract
5. `docs/agents/domain.md` — how to consume docs

## Wave 3 Tasks (after E4 merges schema)

### 1. Project form — XOR ownership

- **File:** `src/app/components/ProjectsPage.tsx`
- The create/edit project form must enforce: a project has exactly one owner — event XOR client, never both, never neither.
- The form should provide a toggle or radio: "Owned by Client" vs. "Owned by Event".
- When "Client" is selected, show the client searchable combobox.
- When "Event" is selected, show the event searchable combobox.
- Rely on E4's database CHECK constraint as the final guard — the form is a UX convenience, the DB is authoritative.
- Existing projects (client-owned) must continue to work; their `event_id` is null.

### 2. Project cost estimate (estimate-only)

- **File:** `src/app/components/ProjectsPage.tsx`
- Build a material/labor/cost-line picker that assembles a **project cost estimate**.
- **CRITICAL:** This is an **estimate only**. Adding a material to the estimate:
  - Does NOT write a stock movement
  - Does NOT change on-hand quantity
  - Does NOT reserve inventory
- Actual consumption or reservation happens explicitly at production, not when estimating.
- The estimate uses the same cost types from the cost catalog (E5's API), displayed as suggestions.
- Estimate lines: description, cost type, quantity, unit, unit cost, extended cost.

### 3. Event-owned projects → event stock list

- When a project is owned by an event, its pieces should be surfaced in that event's stock/product list.
- This is the E6↔E7 contract: E7 writes projects with `event_id`; E6 reads them for the event detail view.
- **Read the contract:** `docs/agents/handoff-e6-e7-event-stock.md`

### 4. Projects API routes

- **Files:** `functions/api/projects/` (new)
- `GET /api/projects` — list projects, filterable by stage, client, event
- `GET /api/projects/:id` — single project with cost estimates
- `POST /api/projects` — create project with XOR owner validation
- `PUT /api/projects/:id` — update project stage, brief, target date
- `GET /api/projects?event_id=X` — list projects for a given event (E6 reads this)
- Auth: verify JWT

## Cross-engineer contract: E6 ↔ E7

- **Read:** `docs/agents/handoff-e6-e7-event-stock.md`
- E7 creates projects with `event_id`. E6 reads them for event detail.
- The contract defines: E7's API response shape for event-owned projects; E6's expected data.
- Neither edits the other's files.

## Design constraints
- Project stage order (display): inquiry → consultation → design → approved → sourcing → production → quality_control → ready → delivered → closed (+ cancelled side state)
- Use `STAGE_PILL`, `STAGE_DOT` patterns from `CorePages.tsx`
- Cost estimate panel: calm, display-case metaphor, one clear focus
- Touch-first: 44×44px minimum targets

## Acceptance criteria
- Project form enforces XOR ownership (event or client, not both, not neither)
- Cost estimate picker assembles estimate-only lines (no stock movements)
- Event-owned projects are queryable by `event_id` for E6's consumption
- API routes handle CRUD with proper validation
- Existing client-owned projects unaffected
