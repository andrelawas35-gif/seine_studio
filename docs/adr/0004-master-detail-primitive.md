# 0004 — MasterDetail layout primitive for record indexes

- Status: Accepted
- Date: 2026-06-28
- Deciders: Owner, Developer (grilling session)

## Context

ADR 0001 scoped `ResponsiveTable` to summary tables and noted that 5 pages
(Invoices, Quotes, Expenses, Certificates, Repairs) each hand-roll the same
master-detail layout: a left sidebar list, a right detail pane, and a mobile
toggle between them. Every page duplicates the responsive grid, mobile
back-button wiring, loading/error/empty states, and toolbar shell.

Phase 2 will add more record-index pages (Catalog pieces, client list, supplier
list, event list). Without a shared primitive, the duplication compounds.

## Decision

Extract a **`MasterDetail` layout primitive** — a layout shell, not a data
component. It owns:

- Responsive 2-panel grid (sidebar + detail) at ≥768px
- Mobile view toggle (list ↔ detail) with back button
- Standardized loading, error, and empty states for the sidebar
- A **toolbar slot** for page-specific search + filters
- A **detail slot** for page-specific content (DocumentCanvas, edit form,
  read-only view, etc.)

It does **not** own data fetching, routing, form logic, or detail rendering.

The sidebar render area accepts arbitrary children (card rows today; card grid
for Catalog in W2). A `variant` prop (`"list"` | `"grid"`) will be added when
the Catalog page needs it — the initial implementation is list-only to avoid
speculative complexity.

## Consequences

- 5 existing pages refactored to use `MasterDetail` (one-time cost)
- All Waves 2–5 record-index pages built on `MasterDetail` from the start
- The primitive is deep (does one layout well) rather than wide (god component)
- `ResponsiveTable` remains the primitive for summary tables; `MasterDetail`
  is the primitive for record indexes. The two are complementary, not competing.

## Alternatives considered

- **Keep duplicating the layout per page** — rejected: 5 copies today, 8+ by
  Wave 5. Bug fixes and responsive improvements would need to be applied 8 times.
- **Make MasterDetail own data fetching** — rejected: the 5 existing pages have
  different fetch patterns (some use `useCallback`+`useEffect`, others use
  polling, some have create flows in-page). A data-fetching god component would
  fight every page's needs.
- **Build grid variant now** — rejected: the Catalog page is the only consumer
  and it arrives in W2. Building grid support without a real consumer risks
  designing the wrong API.
