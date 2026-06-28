# Database Relational & Data-Flow Audit — June 27, 2026

## Scope

Full audit of `src/server/db/schema.ts` (28 tables), API routes in `functions/api/`, server validation in `src/server/`, and frontend components in `src/app/components/`.

## Summary by severity

| Severity | Count | Items |
|----------|-------|-------|
| Critical | 0 | — |
| Medium | 4 | `paidCents` derive gap, missing pages, no pricing search, no cross-nav |
| Low | 5 | Orphaned `actualExpenseId`, invisible stock movement FKs, stored snapshots |
| ✅ Verified | 3 | On-hand derivation, pricing snapshots, event planning values |

---

## Finding 1: `invoices.paidCents` — Derive-Wiring Gap (Medium)

**What:** `paidCents` on `invoices` is a mutable `bigint` column that is **manually synchronized** by the payment POST handler.

**Code path:** `functions/api/payments/index.ts` — when a payment is recorded, it reads the current `paidCents`, adds the new payment amount, and writes back:
```ts
const newPaid = invoice.paidCents + input.amountCents;
db.update(invoices).set({ paidCents: newPaid, ... })
```

**Why it's wrong:** This violates the project principle: *"Revenue, balances, inventory value, cost, margin, profit are derived from source records, never manually duplicated."* If a payment is ever modified, deleted, or inserted directly (bypassing the API handler), `paidCents` drifts from the true `SUM(payments.amountCents)`.

**Recommendation:** Remove the `paidCents` column. Compute balance due at query time:
```sql
SELECT COALESCE(SUM(amount_cents), 0) FROM payments WHERE invoice_id = $1
```
`balanceDueCents` = `totalCents - SUM(payments.amountCents)`.

**Severity:** Medium — no known drift yet, but the architecture bakes in future drift risk.

---

## Finding 2: Missing UI Pages for Existing Tables (Medium)

Three tables have API routes but **no dedicated list/detail pages**:

| Table | API Route | Frontend Page |
|-------|-----------|---------------|
| `catalog_pieces` | `functions/api/catalog/` | ❌ None — only accessible via combobox references |
| `suppliers` | `functions/api/suppliers/` | ❌ None — only accessible via expense creation combobox |
| `locations` | `functions/api/locations/` | ❌ None — only accessible via form comboboxes |

**Impact:** Users cannot browse, search, or manage these entities on their own screens. They only appear as secondary data in comboboxes on other pages. This contradicts the product principle *"Curated, not crammed"* — these entities are important enough to have their own tables and APIs but not their own pages.

**Recommendation:** Add dedicated pages for Catalog, Suppliers, and Locations.

**Severity:** Medium.

---

## Finding 3: No Cross-Navigation Between Related Entities (Medium)

Across all pages, related entity names are rendered as plain `<span>` text. Examples:
- Client name on a project row — not clickable
- Project title on an invoice — not clickable
- Client name on a quote — not clickable
- Inventory lot on a stock movement — not clickable

This violates the product principle: *"One connected history. A client, project, quote, invoice, payment, piece, certificate, repair, and expense should link to each other where applicable."*

**Recommendation:** Make related entity names `<Link>` or `<button>` elements that navigate to the entity's detail page. This is a cross-cutting UI change across all list pages.

**Severity:** Medium.

---

## Finding 4: Orphaned Column `event_budget_lines.actualExpenseId` (Low)

**What:** The FK `actual_expense_id` references `expenses.id` but is **never set by any code path**. It appears to be a planned feature for linking budget lines to realized expenses that was never implemented.

**Recommendation:** Either implement the linking logic or document it as deferred. Do not leave orphaned columns that suggest functionality that doesn't exist.

**Severity:** Low.

---

## Finding 5: Invisible Stock Movement Foreign Keys (Low)

The following FKs on `stock_movements` exist but are **never surfaced in any UI**:
- `project_id` — which project consumed this stock?
- `event_id` — which event consumed/sold this stock?

Users cannot navigate from a stock movement to the related project or event, making it hard to trace why stock was consumed.

**Recommendation:** Surface these FKs in the inventory/stock movement detail views.

**Severity:** Low.

---

## Finding 6: Stored `totalCents` on Invoices (Low)

Invoice totals (`subtotalCents`, `discountCents`, `taxCents`, `totalCents`) are stored as mutable columns. When an invoice is finalized from a quote, the amounts are copied as a snapshot — which is correct for immutability. But the concept is that finalized invoices have an immutable line-items snapshot (`line_items_snapshot`), so the totals could be computed from it rather than stored separately.

**Recommendation:** Low priority. The snapshot pattern is acceptable for invoices. Just ensure the stored totals match the snapshot on every read.

**Severity:** Low.

---

## Finding 7: `balanceDueCents` Inheritance (Low)

`invoices.balance_due_cents` is not a physical column — it's computed in the API response as `totalCents - paidCents`. However, `paidCents` itself is a stored mutable value (see Finding 1). This means `balanceDueCents` inherits the derive-wiring gap.

**Recommendation:** Fix Finding 1 first, then `balanceDueCents` becomes correctly derived from `totalCents - SUM(payments)`.

**Severity:** Low.

---

## Finding 8: Accounting Metrics Inheritance (Low)

Revenue, gross profit, and other metrics in the Accounting page are computed from stored `totalCents` and `paidCents` values. If Finding 1 is not fixed, these metrics inherit the drift risk.

**Severity:** Low.

---

## ✅ Verified Correct Patterns

### On-hand quantity derivation ✅
`inventory_lots` on-hand quantity is correctly derived from append-only `stock_movements`. The API groups movements by type, classifying adds (`receipt`, `return`, `release`, `adjustment_increase`) and subtracts (`consume`, `sale`, `damage`, `loss`, `reserve`, `adjustment_decrease`). Transfer is neutral. The lot creation flow writes an initial `receipt` movement so `initialQuantity` is never double-counted.

### Pricing version snapshots ✅
`pricing_versions` stores `inputs` and `cost_lines` as `jsonb` snapshots at save time. This correctly preserves historical pricing even when rates/catalog change later (ADR-0003).

### Event planning values ✅
`events.revenueTargetCents` and `events.budgetCents` are correctly stored as planning estimates (not financial records), with proper CHECK constraints (`>= 0`). Actual event revenue/expenses will be derived from linked invoices/expenses in Phase 2.

---

## Table Inventory (28 tables)

| # | Table | Has API | Has Page | Cross-nav |
|---|-------|---------|----------|-----------|
| 1 | `app_users` | ✅ `/api/me` | ✅ SignInPage | N/A |
| 2 | `clients` | ✅ | ✅ ClientsPage | ❌ |
| 3 | `locations` | ✅ | ❌ | N/A |
| 4 | `catalog_pieces` | ✅ `/api/catalog` | ❌ | N/A |
| 5 | `inventory_lots` | ✅ | ✅ InventoryPage | ❌ |
| 6 | `projects` | ✅ | ✅ ProjectsPage | ❌ |
| 7 | `events` | ✅ | ✅ EventsPage | ❌ |
| 8 | `event_tasks` | Via events | ✅ (in EventsPage) | ❌ |
| 9 | `event_inventory_allocations` | Via events | ✅ (in EventsPage) | ❌ |
| 10 | `event_budget_lines` | Via events | ✅ (in EventsPage) | ❌ |
| 11 | `stock_movements` | Via inventory | ✅ (in InventoryPage) | ❌ |
| 12 | `pricing_calculations` | ✅ | ✅ AccountingPage | ❌ |
| 13 | `pricing_versions` | Via pricing | ✅ (in AccountingPage) | ❌ |
| 14 | `reply_templates` | ✅ | ✅ ReplyTemplatesPage | ❌ |
| 15 | `reply_template_versions` | Via templates | ✅ (in ReplyTemplatesPage) | ❌ |
| 16 | `activity_events` | ❌ | ❌ | N/A |
| 17 | `quotes` | ✅ | ✅ QuotesPage | ❌ |
| 18 | `quote_versions` | Via quotes | ✅ (in QuotesPage) | ❌ |
| 19 | `invoices` | ✅ | ✅ InvoicesPage | ❌ |
| 20 | `payments` | Via invoices | ✅ (in InvoicesPage) | ❌ |
| 21 | `suppliers` | ✅ | ❌ | N/A |
| 22 | `expenses` | ✅ | ✅ ExpensesPage | ❌ |
| 23 | `certificates` | ✅ | ✅ CertificatesPage | ❌ |
| 24 | `certificate_revisions` | Via certificates | ✅ (in CertificatesPage) | ❌ |
| 25 | `repair_tickets` | ✅ | ✅ RepairsPage | ❌ |
| 26 | `repair_events` | Via repairs | ✅ (in RepairsPage) | ❌ |
| 27 | `notifications` | ✅ | ✅ NotificationsPanel | N/A |
| 28 | `notification_preferences` | ✅ | ✅ NotificationSettings | N/A |
