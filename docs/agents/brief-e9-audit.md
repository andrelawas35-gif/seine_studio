# E9 — Audit / Investigation Engineer (Read-Only)

## Constraints (CRITICAL)

- **Read-only.** E9 never edits any source code, schema, config, or migration.
- E9 writes findings documents only: `docs/agents/search-audit.md` and `docs/agents/db-audit.md`.
- Fully parallel — zero collision risk with any other engineer.

## Required reading

1. `CLAUDE.md` — hard constraints
2. `CONTEXT.md` — domain glossary
3. All 5 ADRs in `docs/adr/`
4. `project.md` — full design doc

## Wave 1 Tasks

### 1. Search audit

**Output:** `docs/agents/search-audit.md`

Investigation steps:
- Run the app in API mode.
- Test search on all 10 list pages (Overview is not a list page):
  1. Projects
  2. Inventory
  3. Clients
  4. Events
  5. Quotes
  6. Invoices
  7. Expenses
  8. Accounting (Pricing tab)
  9. Certificates
  10. Repairs
- For each page, classify the search behavior as:
  - **Working** — returns relevant results
  - **Empty data** — search UI exists but no data to search
  - **Fixtures only** — works with local fixtures, untested with API
  - **Bug** — search fails, returns wrong results, or is missing entirely
- Include screenshots or descriptions of any broken search states.
- Recommend whether to:
  - Add a global search (cross-entity, type-ahead)
  - Fix specific page searches
  - Defer global search to an upgrade

### 2. Database relational + data-flow audit

**Output:** `docs/agents/db-audit.md`

Investigation steps:
- Read `src/server/db/schema.ts` in full.
- Map all 27+ tables and their relationships (FKs).
- For each relationship, determine:
  - Is the FK surfaced in the UI? (Can you navigate from one entity to a related one?)
  - Is cross-navigation missing? (e.g., from a client, can you see their projects?)
  - Are there orphaned or unused tables?
- Data-flow analysis:
  - Which derived values (revenue, balances, inventory, cost, margin, profit) are computed from source records vs. stored manually?
  - Are there any "derive-wiring gaps" — a field that *should* be derived but is stored as a mutable value?
  - Check: `paidCents` on invoices — is it derived from payment records or manually set?
  - Check: on-hand quantity — is it derived from stock movements or stored?
- For each finding, note:
  - The table/column
  - The issue (orphaned, unused, missing nav, derive-wiring gap)
  - Severity (critical / medium / low)
  - Recommendation

## Existing table inventory (27 tables from schema.ts)
1. `app_users`
2. `clients`
3. `locations`
4. `catalog_pieces`
5. `inventory_lots`
6. `projects`
7. `events`
8. `event_tasks`
9. `event_inventory_allocations`
10. `event_budget_lines`
11. `stock_movements`
12. `pricing_calculations`
13. `pricing_versions`
14. `reply_templates`
15. `reply_template_versions`
16. `activity_events`
17. `quotes`
18. `quote_versions`
19. `invoices`
20. `payments`
21. `suppliers`
22. `expenses`
23. `certificates`
24. `certificate_revisions`
25. `repair_tickets`
26. `repair_events`
27. Plus any E4 adds in Wave 2 (settings, cost_catalog, event_price_list, consignment, consignment_count, consignment_count_items)

## Acceptance criteria
- `search-audit.md` exists with per-page search classification + recommendations
- `db-audit.md` exists with full table map, relationship analysis, and derive-wiring gap findings
- Both documents are factual, specific (table/column names), and actionable
- No code was modified
