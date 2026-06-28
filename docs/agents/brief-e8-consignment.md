# E8 — Consignment Engineer

## Files owned (exclusive — all new files, lowest collision risk)

| File / Area | Purpose |
|-------------|---------|
| `src/app/components/ConsignmentPage.tsx` (new) | Consignment list, detail, counts |
| `functions/api/consignment/` (new) | Consignment API routes |

## Required reading (before touching code)

1. `CLAUDE.md` — design system, interaction rules, data rules
2. `CONTEXT.md` — **Consignment**, **Consignment count**, **Stock movement**, **On-hand quantity**, **Reserved quantity** definitions
3. `docs/adr/0004-consignment-as-distinct-entity.md` — consignment ≠ event
4. `docs/agents/domain.md` — how to consume docs

## Wave 3 Tasks (after E4 merges schema)

### 1. Consignment page

- **File:** `src/app/components/ConsignmentPage.tsx` (new)
- List consignment partner shops with name, contact info, active status.
- Create/edit consignment: name, contact name, email, phone, address, notes.
- A consignment has **no start/end dates** — unlike events, it is long-lived.
- Stock placed on consignment remains the studio's until sold.

### 2. Monthly consignment counts

- Within each consignment detail, show a list of periodic counts (typically monthly).
- Each count is a **snapshot** of what stock is physically at the consignment at a point in time.
- A consignment count is a **recorded observation, NOT a stock movement** — it never rewrites the append-only movement history.
- Count UI: select inventory lots, enter counted quantity, see expected on-hand (derived), note discrepancies.

### 3. Create new count flow

- Select a consignment → "New Count" → date (defaults to today) → list of inventory lots currently at this consignment.
- For each lot: show expected quantity (derived from movements), let user enter counted quantity, flag discrepancies.
- Save the count. It does NOT create stock movements — reconciliation against derived on-hand is a deliberate, separate step.

### 4. Consignment API routes

- **Files:** `functions/api/consignment/` (new)
- `GET /api/consignment` — list all consignments
- `GET /api/consignment/:id` — single consignment with count history
- `POST /api/consignment` — create consignment
- `PUT /api/consignment/:id` — update consignment
- `GET /api/consignment/:id/counts` — list counts for a consignment
- `POST /api/consignment/:id/counts` — create a new count with items
- Auth: verify JWT

## Relationship to Events (ADR-0004)
- Events are temporary, dated selling occasions.
- Consignments are long-lived partner shops with no dates.
- They share the concept of "stock held externally" but are distinct entities with distinct pages.
- Do NOT reuse event UI components — build consignment-specific UI.

## Design constraints
- New page: follow French Minimal / display-case metaphor
- Mobile-first: consignment list as cards on phone, table on desktop
- Count entry: mobile-friendly numeric inputs

## Acceptance criteria
- Consignment page lists partner shops with create/edit capability
- Monthly count flow records snapshot observations (not stock movements)
- Count shows expected vs. counted quantities with discrepancy flags
- API routes handle CRUD for consignments and counts
- No edits to events, projects, or any other engineer's files
