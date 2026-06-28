# Search Audit — June 27, 2026

## Summary

Investigated search on all 10 list pages. **5 Working | 2 Fixtures only | 1 Bug | 2 Missing.**

| # | Page | Classification | Key Issue |
|---|------|---------------|-----------|
| 1 | **Projects** | Fixtures only | API has `q` search but frontend filters locally |
| 2 | **Inventory** | ✅ Working | Both client-side and API search work correctly |
| 3 | **Clients** | Fixtures only | API has `q` search but frontend filters locally |
| 4 | **Events** | ❌ Missing | No search UI at all; API has no text search |
| 5 | **Quotes** | ✅ Working | Searches by `quoteNumber` only |
| 6 | **Invoices** | ✅ Working | Searches by `invoiceNumber` only |
| 7 | **Expenses** | ❌ Bug | Frontend sends `q` but API silently ignores it |
| 8 | **Accounting (Pricing)** | ❌ Missing | No search for pricing history |
| 9 | **Certificates** | ✅ Working | Searches `certificateNumber` + `pieceName` |
| 10 | **Repairs** | ✅ Working | Searches `ticketNumber` + `pieceDescription` |

## Detailed findings

### 1. Projects — Fixtures only (P1)
- **Status:** API route `functions/api/projects/index.ts` has `q` query param with `ilike` on title and project_number. Frontend `ProjectsPage.tsx` fetches ALL projects then filters locally with `useMemo`.
- **Fix:** Pass search query to API as `?q=term` instead of client-side filter.
- **Severity:** Medium — search degrades as project count grows.

### 2. Inventory — ✅ Working
- Client-side fixture search and API search both correctly filter by keyword.

### 3. Clients — Fixtures only (P1)
- **Status:** Same pattern as Projects. API supports `q`, frontend filters locally.
- **Fix:** Pass `?q=term` to API.
- **Severity:** Medium.

### 4. Events — Missing (P1)
- **Status:** No search input in `EventsPage.tsx`. `eventListQuery` only has `stage` filter. No text search in API.
- **Fix:** Add search input and API `q` param filtering on name, venue, organizer.
- **Severity:** Medium — no way to find an event by name.

### 5. Quotes — ✅ Working
- Searches by `quoteNumber` via API. Limitation: can't search by client name.

### 6. Invoices — ✅ Working
- Searches by `invoiceNumber` via API. Limitation: can't search by client name.

### 7. Expenses — Bug (P0)
- **Status:** Frontend `ExpensesPage.tsx` has a search box and sends `q`. But `functions/api/expenses/index.ts` reads `category`, `projectId`, `isCogs` — never reads `q`. The search is a **silent no-op** in API mode.
- **Fix:** Add `q` to query params, add `ilike` on description to the API.
- **Severity:** High — users think they're searching but get unfiltered results.

### 8. Accounting (Pricing) — Missing (P2)
- **Status:** `PricingCalculator.tsx` is creation-only. Past pricing calculations are listed in `AccountingPage.tsx` with no search.
- **Fix:** Add search/filter to pricing history list.
- **Severity:** Low.

### 9. Certificates — ✅ Working
- Searches `certificateNumber` + `pieceName` via API.

### 10. Repairs — ✅ Working
- Searches `ticketNumber` + `pieceDescription` via API.

## Global search

- **No global search exists.** The `Search` icon is imported in `App.tsx` but never rendered. No cross-entity type-ahead or CommandPalette.
- **Recommendation:** Defer global search to a post-launch upgrade. Fix the per-page bugs first.

## Recommendations (priority order)

1. **P0:** Fix Expenses API to accept and filter by `q` param
2. **P1:** Add search to Events page + API
3. **P1:** Wire Projects and Clients frontend to pass `q` to API
4. **P2:** Add client name to Quotes/Invoices search scope
5. **P3:** Add search to pricing history list
6. **Upgrade:** Global cross-entity search
