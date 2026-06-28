# Multi-Agent Build Plan — Seine Studio

**Status:** Active (2026-06-28) — Waves 0-2 complete, Waves 3-6 pending
**Controller:** GitHub Copilot (DeepSeek V4 Pro)
**Goal:** Divide the build into context-engineered waves, each assigned to a specialized agent with explicit reference docs, acceptance criteria, and handoff artifacts.

---

## Architecture of the plan

Each wave is a **context pack** — a self-contained set of reference documents, domain vocabulary, and tasks that one agent can consume without needing the full project history. Waves are sequenced so each one's output becomes the next one's foundation.

### Context engineering principles

1. **Minimal context, maximum precision.** Each agent gets only the docs and glossary terms it needs for its wave — not the entire repo.
2. **Domain vocabulary enforcement.** Every task references the exact glossary term from `CONTEXT.md`. No synonyms.
3. **ADR-gated decisions.** No agent may contradict an existing ADR. If a task requires a new decision, the agent flags it for the controller.
4. **Handoff artifacts.** Each wave produces a concrete artifact (migration, component, page, API change) that the next wave consumes.
5. **Immutable references.** Agents reference docs by path + section, not by memory. The glossary is the single source of truth.

---

## Wave map

```
Wave 0: Schema migrations (DB agent) ✅ COMPLETE ────────────────────────────┐
  ↓ produces: migrated DB with new columns/enums                              │
                                                                              │
Wave 1: UI foundation hardening (UI agent) ✅ COMPLETE ────────────────────── │
  ↓ produces: type-scale tokens, ResponsiveTable, Command combobox adoptions  │
                                                                              │
Wave 2: Catalog / Pieces page (Full-stack agent) ✅ COMPLETE ──────────────── │
  ↓ produces: piece 360 view, PiecePicker, card grid                         │
                                                                              │
Wave 3: Quote → Project → Invoice spine (Full-stack agent) ────────────────── │
  ↓ produces: pricing-in-quote, convert-to-project, project billing          │
                                                                              │
Wave 4: Events & sales (Full-stack agent) ──────────────────────────────────── │
  ↓ produces: event sales, stock-out on sale, expense project/event picker   │
                                                                              │
Wave 5: Traceability & 360 views (Full-stack agent) ────────────────────────── │
  ↓ produces: cert→project, repair→piece/project, client 360, finance dash   │
                                                                              │
Wave 6: Polish & PWA hardening (UI + QA agent) ─────────────────────────────── │
     produces: mobile pass, print pass, a11y pass, icon set                  │
```

---

## Wave 0 — Schema migrations (DB-only agent)

### Reference docs
- `CONTEXT.md` — full glossary, especially: Piece, Project, Quote, Invoice, Certificate, Repair, Stock movement
- `docs/adr/0003-piece-project-invoice-model.md` — model decisions D2, D5, D6, D7
- `docs/plans/data-workflow-and-domain.md` — decisions D2, D5, D6, D7, D12, D26

### Domain vocabulary to internalize
- **Piece** = reusable design/product (`catalog_pieces`). Not a repair item, not a pricing label.
- **Project** = commission job. Optionally references a Piece (`catalog_piece_id`).
- **Invoice** = demand for payment. Has `project_id` (commission) or `event_id` (direct sale).
- **Certificate** = numbered authenticity document. Links to Piece + Project.
- **Repair** = aftercare on client's existing jewelry. Optionally links to own Piece/Project.

### Tasks

#### M0.1 — Add `catalog_pieces.image_url`
**Decision ref:** D26
```sql
ALTER TABLE catalog_pieces ADD COLUMN image_url text;
```
- Nullable. No default. URL only (no upload infra).

#### M0.2 — Add `projects.catalog_piece_id`
**Decision ref:** D2
```sql
ALTER TABLE projects ADD COLUMN catalog_piece_id uuid
  REFERENCES catalog_pieces(id) ON DELETE SET NULL;
CREATE INDEX projects_catalog_piece_idx ON projects(catalog_piece_id);
```

#### M0.3 — Slim `project_stage` enum 11→7
**Decision ref:** D12
- New canonical stages: `inquiry`, `design`, `approved`, `production`, `quality_control`, `ready`, `delivered`
- Side state: `cancelled`
- **Mapping of existing rows:**
  - `consultation` → `inquiry`
  - `sourcing` → `production`
  - `closed` → `delivered`
  - All others that don't map → `inquiry` (safe fallback)
- Migration approach: create new enum, add column, migrate data, drop old column, rename.

#### M0.4 — Add `invoices.event_id`
**Decision ref:** D5
```sql
ALTER TABLE invoices ADD COLUMN event_id uuid
  REFERENCES events(id) ON DELETE SET NULL;
CREATE INDEX invoices_event_idx ON invoices(event_id);
```

#### M0.5 — Add `certificates.project_id`
**Decision ref:** D6
```sql
ALTER TABLE certificates ADD COLUMN project_id uuid
  REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX certificates_project_idx ON certificates(project_id);
```

#### M0.6 — Add `repairs.catalog_piece_id` and `repairs.project_id`
**Decision ref:** D7
```sql
ALTER TABLE repair_tickets ADD COLUMN catalog_piece_id uuid
  REFERENCES catalog_pieces(id) ON DELETE SET NULL;
ALTER TABLE repair_tickets ADD COLUMN project_id uuid
  REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX repair_tickets_catalog_piece_idx ON repair_tickets(catalog_piece_id);
CREATE INDEX repair_tickets_project_idx ON repair_tickets(project_id);
```

### Acceptance criteria
- All 6 migrations applied to dev branch and verified via `run_sql`
- Existing rows mapped correctly (especially stage enum)
- No data loss on nullable FKs
- Indexes created for all new FK columns
- `_journal.json` updated

### Handoff artifact
- Migration SQL file(s) + verification queries
- Updated Drizzle schema (`src/server/db/schema.ts`) reflecting new columns

---

## Wave 1 — UI foundation hardening (UI agent)

### Reference docs
- `docs/adr/0001-phase-2-ui-foundation.md` — type-scale tokens, primitives, light-only
- `docs/adr/0002-shared-document-canvas.md` — DocumentCanvas (exists, verify only)
- `project.md` — Design Rationale section (Design System, Interaction Rules)
- `CONTEXT.md` — Design Language section (Display case, Eyebrow, Caption, Museum gold, Seine mark)

### Domain vocabulary to internalize
- **Display case** — curated content panel, generous whitespace, hairline borders
- **Eyebrow** — 11px uppercase micro-label (museum label style)
- **Caption** — 12px secondary text
- **Museum gold** — single sparing accent, never status color

### Tasks

#### U1.1 — Enforce type-scale floor (no text below 11px)
- Audit `globals.css` and all component files for `text-[8px]`, `text-[9px]`, `text-[10px]`
- Replace with semantic tokens: `eyebrow` (11px), `caption` (12px), `body` (14px)
- Bottom-nav labels at 8px are the ONE exception (standard mobile nav convention)
- Verify: `grep -r 'text-\[\(8\|9\|10\)px\]' src/` returns only bottom-nav exceptions

#### U1.2 — Replace native `<select>` with Command combobox
- Files to convert (search for native `<select>` in Phase 1 pages):
  - `ClientsPage.tsx`
  - `ProjectsPage.tsx`
  - `InventoryPage.tsx`
  - `ExpensesPage.tsx`
  - `RepairsPage.tsx`
  - `EventsPage.tsx`
- Pattern: `<Command>` with search, keyboard nav, empty state, loading state
- Each must support: recent/frequent, search by name+ID, inline Create new, no-result state

#### U1.3 — Adopt ResponsiveTable for all list views
- Verify `ResponsiveTable` component exists in `src/app/components/ui/responsive-table.tsx`
- Convert remaining list views not already using it:
  - Quotes list
  - Invoices list
  - Expenses list
  - Repairs list
  - Certificates list
- Pattern: `<ResponsiveTable columns={...} data={...} mobileCard={...} />`

#### U1.4 — Strip dark mode
- Remove `.dark` class handling from theme
- Remove dark mode toggle from UI
- Ensure light-only palette is the only rendered theme
- Verify: no `prefers-color-scheme: dark` media query remains

#### U1.5 — Verify DocumentCanvas exists
- Check `src/app/components/DocumentCanvas.tsx` renders A4 geometry, Seine masthead, hairline rules
- Verify `@media print` hides app shell
- If missing, flag to controller — do NOT build from scratch in this wave

### Acceptance criteria
- Zero text elements below 11px (except bottom-nav labels)
- Zero native `<select>` elements in production pages
- All list views use ResponsiveTable
- No dark mode artifacts
- Type-scale tokens documented in `globals.css` as CSS variables

### Handoff artifact
- Updated `src/styles/globals.css` with type-scale tokens
- Converted component files
- Verified `ResponsiveTable` and `DocumentCanvas` ready for Wave 3

---

## Wave 2 — Catalog / Pieces page (Full-stack agent)

### Reference docs
- `CONTEXT.md` — Piece, Catalog, SKU definitions
- `docs/plans/data-workflow-and-domain.md` — decisions D9, D25, D26, D27
- `docs/adr/0003-piece-project-invoice-model.md` — Piece as reusable design
- `project.md` — Design Rationale (Display case metaphor), Assisted Data Entry (searchable comboboxes)

### Domain vocabulary to internalize
- **Piece** = reusable design/product. SKU, materials, metal/karat, stone summary, retail price, estimated cost.
- **Catalog** = design hub / 360 view. Image-forward card grid + per-piece usage view.
- **Not a piece** = repair item description, pricing free-text label.

### Prerequisites
- Wave 0 M0.1 (`catalog_pieces.image_url`) applied
- Wave 1 type-scale and Command combobox available

### Tasks

#### F2.1 — Build Catalog list page (card grid)
- Route: `/catalog` (new top-level nav item, placed next to Inventory)
- Layout: image-forward card grid (2 cols mobile, 3-4 cols desktop)
- Each card: image thumbnail (or placeholder), SKU (DM Mono), name (Playfair), category pill, retail price
- Empty state: "No designs yet. Create your first piece."
- Filter: by category (Ring, Necklace, Earrings, Bracelet, Pendant, Brooch, Other)
- Search: by SKU, name, metal, stone summary (use Command combobox pattern)

#### F2.2 — Build Piece detail / 360 view
- Route: `/catalog/:pieceId`
- Sections:
  1. **Header:** Image (large), SKU, name, category, collection, metal/karat, stone summary
  2. **Pricing:** Retail price (DM Mono), Estimated cost (labeled "estimated / standard cost — actual COGS derives from stock")
  3. **Usage — Projects:** list of projects referencing this piece, with stage pill + client
  4. **Usage — Stock:** on-hand finished-piece stock (derived from `inventory_lots` where `catalog_piece_id` matches + kind = `finished_piece`)
  5. **Usage — Sold:** units sold + revenue (derived from invoice line items referencing this piece)
  6. **Usage — Certificates:** issued certificates for this piece
- Layout: desktop = 2-column (image left, details right + full-width sections below); mobile = stacked

#### F2.3 — Build Piece create/edit form
- Form fields: image URL, SKU (manual, required, unique), name, category (preset dropdown → Command), collection (free text), metal type, karat, stone summary, retail price (₱, numeric keyboard), estimated cost (₱)
- Create: opens as Sheet on mobile, modal on desktop
- Edit: inline on detail page or Sheet
- Archive: soft-delete only (API already supports `archivedAt`)
- Validation: SKU required + unique check, name required, retail price ≥ 0

#### F2.4 — Wire nav
- Add "Catalog" to bottom nav (final: 4 primary icons — Home, Projects, Catalog, Clients — with Inventory moved to "More" drawer for native app feel)

### Acceptance criteria
- Catalog page renders card grid with filtering
- Piece detail shows all 6 sections with live data
- Create/edit form validates and saves
- Piece picker (Command combobox) reusable in Waves 3-5
- Mobile: card grid wraps to single column, detail stacks vertically

### Handoff artifact
- Working Catalog page + Piece detail
- Reusable `PiecePicker` component (Command combobox for piece selection)
- Updated navigation structure

---

## Wave 3 — Quote → Project → Invoice spine (Full-stack agent)

### Reference docs
- `CONTEXT.md` — Quote, Pricing, Project, Invoice, Payment definitions
- `docs/plans/data-workflow-and-domain.md` — decisions D4, D10, D11, D12, D13, D14, D21, D22, D23, D24, D28, D29, D30, D31
- `docs/adr/0003-piece-project-invoice-model.md` — full model
- `docs/adr/0002-shared-document-canvas.md` — DocumentCanvas for quote/invoice rendering
- `project.md` — Pricing Calculator section, Lifecycle locking rules

### Domain vocabulary to internalize
- **Quote** = versioned, itemized estimate. Locks at Accepted. Pricing versions attached to it.
- **Pricing (cost build)** = itemized cost lines → total cost + markup − discount = selling price. Gross profit / margin % derived.
- **Project** = commission job. Auto-numbered (`PRJ-XXXX`). 7 stages. References Piece.
- **Invoice** = demand for payment. Deposit + Balance are separate invoices. Locks at Issued.
- **Payment** = received money against an invoice. Balance is derived.
- **DocumentCanvas** = shared printable document component.

### Prerequisites
- Wave 0 M0.2, M0.3 applied
- Wave 1 type-scale and primitives available
- Wave 2 Catalog page + PiecePicker available

### Tasks

#### F3.1 — Embed pricing calculator into Quote detail
**Decision ref:** D14, D22, D28
- Remove standalone Pricing tab from Accounting page (D15)
- Move `PricingCalculator.tsx` into Quote detail as the pricing-version editor
- "Save version" writes to the quote (`pricing_versions` table, linked to `quote.id`)
- Quote detail renders from the latest pricing version snapshot
- Replace "Piece or service" free-text with PiecePicker (D30)
- Show piece retail as benchmark beside computed price (D30)
- Rename labels: "Net capital" → "Total cost", "Brand value" → "Markup" (D29)
- Add target margin guardrail: configurable %, amber warning if below (D31)
- Remove `localStorage` pricing version history and standalone `/pricing` API (D28)

#### F3.2 — Implement "Convert to project" from accepted quote
**Decision ref:** D10, D21
- Button on accepted quote: "Convert to project"
- Creates project pre-linked to: quote, client, piece (from quote's piece reference)
- Auto-generates project number: `PRJ-XXXX` (D11)
- Defaults stage to `inquiry` (no stage picker at create time)
- Opens slim project edit form (target date, brief) — not the old full form

#### F3.3 — Slim project stages 11→7
**Decision ref:** D12
- Update `STAGE_ORDER`, `STAGE_LABELS`, `STAGE_DOT_COLOR`, `STAGE_PILL_STYLE` in `projects.ts`
- New canonical order: inquiry → design → approved → production → quality_control → ready → delivered
- Update stage progression UI (next-stage button, stage history)
- Update all filters/views that reference stages

#### F3.4 — Invoice billing from project
**Decision ref:** D4, D13, D23
- "Create invoice" launches from project detail
- Choice: **Deposit** (pre-fills deposit% × accepted-quote total) or **Balance** (pre-fills quote total − already invoiced)
- Each creates a separate invoice with `projectId` set
- Amounts inheritable but overridable
- Remove `depositPercent`-on-one-invoice model
- Standalone create kept only for direct/event/walk-in sales (D23)

#### F3.5 — Implement lifecycle edit-locking
**Decision ref:** D24
- Quote: editable until status = `accepted`; then locked (new version or new quote only)
- Invoice: editable until status = `issued`; then only payment/void/refund
- Certificate: editable until status = `issued`; then new revision only
- UI: show lock badge + explanatory tooltip on locked documents
- API: enforce at server level (not just UI)

#### F3.6 — Render quotes and invoices through DocumentCanvas
- Quote detail: "Print" / "Copy" uses DocumentCanvas with quote snapshot
- Invoice detail: same for invoice snapshot
- Verify A4 geometry, Seine masthead, hairline rules, `@media print` behavior

### Acceptance criteria
- Full flow works: Quote create → add piece + pricing → accept → convert to project → bill deposit invoice → bill balance invoice → payments
- Pricing calculator shows cost build with target margin warning
- Project number auto-generated
- Project stage progression uses 7 canonical stages
- Locked documents show lock UI and reject edits
- Printed quotes/invoices match DocumentCanvas spec

### Handoff artifact
- Working Quote→Project→Invoice→Payment flow
- Updated `pricing.ts` with calculator integrated into quote
- Updated `projects.ts` with slim stages + auto-numbering
- Lifecycle locking enforced on server + client

---

## Wave 4 — Events & sales (Full-stack agent)

### Reference docs
- `CONTEXT.md` — Event, Stock movement, Reservation, Available quantity, Studio buffer definitions
- `docs/plans/data-workflow-and-domain.md` — decisions D5, D8, D18, D19, D20
- `docs/adr/0003-piece-project-invoice-model.md` — event sales model

### Domain vocabulary to internalize
- **Event** = temporary selling occasion with its own location. Revenue = direct sales only.
- **Stock movement** = append-only, immutable. `sale` movement reduces on-hand.
- **Available quantity** = on-hand − reserved − studio buffer.
- **Expense** = business cost. `isCogs` flag. Attachable to project/event.

### Prerequisites
- Wave 0 M0.4 applied
- Wave 2 PiecePicker available
- Wave 3 invoice billing working

### Tasks

#### F4.1 — Wire invoice.event_id for event sales
**Decision ref:** D5, D8
- Event detail shows: "Record sale" action (D20)
- Sale flow: pick finished pieces from stock (PiecePicker filtered to in-stock finished pieces) + client (or walk-in) → auto-creates invoice with `eventId` set
- Invoice line items priced from each piece's `retailPriceCents`
- Auto-records stock-out movement + payment (one action)
- Event P&L queries `invoices WHERE event_id = X` directly
- Remove through-project invoice filter from event finance

#### F4.2 — Finished-piece stock linking
**Decision ref:** D18
- Batch create/edit form: when `kind = finished_piece`, show PiecePicker (required)
- Inventory list: show linked piece name + SKU for finished-piece batches
- Piece detail (Wave 2): show on-hand from linked batches

#### F4.3 — Expense project/event picker
**Decision ref:** D19
- Add optional Project picker and Event picker to expense create/edit form
- FKs already exist in schema (`expenses.project_id`, `expenses.event_id`)
- Category-based COGS default: materials/production → `isCogs = true`; overhead → `isCogs = false`
- Inline guidance text: explains what COGS means for margin calculation

#### F4.4 — Studio buffer
- Add studio buffer % setting (default ~15%) to event configuration
- Event "available to pull" = on-hand finished pieces × (1 − buffer%)
- Display buffer-adjusted available quantity on event stock-pull screen

### Acceptance criteria
- Event sale records invoice + stock-out + payment in one action
- Event P&L shows only direct sales (not commission-origin metadata)
- Finished-piece batches require piece link
- Expenses attachable to project/event with COGS guidance
- Studio buffer reduces available quantity on event pull screen

### Handoff artifact
- Working event sale flow
- Updated inventory batch form with piece picker
- Updated expense form with project/event pickers + COGS guidance
- Studio buffer configuration + display

---

## Wave 5 — Traceability & 360 views (Full-stack agent)

### Reference docs
- `CONTEXT.md` — Certificate, Repair, Client definitions
- `docs/plans/data-workflow-and-domain.md` — decisions D6, D7, D15, D16
- `docs/adr/0003-piece-project-invoice-model.md` — certificate + repair model
- `docs/adr/0002-shared-document-canvas.md` — DocumentCanvas for certificates
- `project.md` — Accounting/Reports section

### Domain vocabulary to internalize
- **Certificate** = numbered authenticity document. Snapshot-based rendering. Links Piece + Project. Locks at Issued.
- **Repair** = aftercare on client's existing jewelry. Optional own-piece/project link.
- **Client 360** = single view of client's projects, quotes, invoices, repairs, certificates + derived lifetime spend and balance.

### Prerequisites
- Wave 0 M0.5, M0.6 applied
- Wave 3 lifecycle locking working
- Wave 4 event sales working

### Tasks

#### F5.1 — Certificate → Project link
**Decision ref:** D6
- Certificate create/edit form: add Project picker (optional, filtered to client's projects)
- Certificate detail: show linked project with stage + client
- Project detail: show issued certificates
- Verify: printed certificate still renders from immutable snapshot

#### F5.2 — Repair → Piece/Project link
**Decision ref:** D7
- Repair create/edit form: rename "Piece description" → "Item description" (D3)
- Add optional Piece picker ("Was this originally our piece?")
- If piece selected, auto-suggest linked project
- Repair detail: show linked piece + project
- Piece detail (Wave 2): show repairs for this piece
- Project detail: show repairs for this project

#### F5.3 — Client 360 view
**Decision ref:** D16
- `/clients/:id` API: return linked projects, quotes, invoices (with balance), repairs, certificates + derived lifetime spend + outstanding balance
- Client detail page sections:
  1. **Header:** name, contact, location, preferences, important dates
  2. **Projects:** list with stage pills + deadlines
  3. **Quotes:** list with status + totals
  4. **Invoices:** list with status + balance due
  5. **Repairs:** list with status
  6. **Certificates:** list with piece names
  7. **Summary:** lifetime spend, outstanding balance (derived, never stored)

#### F5.4 — Finance dashboard (Accounting page cleanup)
**Decision ref:** D15
- Remove Pricing tab from Accounting page
- Remove dead `accountingData.ts` mock layer
- Rename first tab to "Financial summary"
- Sections: collected revenue, outstanding, COGS vs OPEX, net profit, trends (all derived from invoices + expenses)
- Ensure it doesn't collide with Operations Overview

#### F5.5 — Render certificates through DocumentCanvas
- Certificate detail: "Print" / "Copy" uses DocumentCanvas with certificate snapshot
- Verify: immutable rendering (editing piece name later doesn't change issued cert)

### Acceptance criteria
- Certificate form has project picker; project detail shows certs
- Repair form has piece picker; labels use "Item description" not "Piece description"
- Client detail shows 360 view with derived spend + balance
- Accounting page has no Pricing tab; shows financial summary from live data
- Certificates print through DocumentCanvas from snapshots

### Handoff artifact
- Working Client 360 page
- Updated Certificate + Repair forms with new links
- Clean Accounting/Finance dashboard
- Verified print output for all 3 document types

---

## Wave 6 — Polish & PWA hardening (UI + QA agent)

### Reference docs
- `project.md` — Mobile Application Shell section, Interaction Rules, Brand Direction (icon variants)
- `docs/adr/0001-phase-2-ui-foundation.md` — light-only launch
- `CLAUDE.md` — PWA section (registerType, offline rules, conflict resolution)
- `CONTEXT.md` — Design Language

### Tasks

#### P6.1 — Mobile audit
- Test every page at 375×812 (iPhone SE) and 414×896 (iPhone 11 Pro Max)
- Verify: bottom nav works, no horizontal scroll, touch targets ≥44×44px
- Verify: forms work with keyboard open (save button reachable)
- Verify: safe area insets respected
- Verify: numeric inputs show numeric keyboard

#### P6.2 — Print audit
- Test print output for: Quote, Invoice, Certificate
- Verify: A4 geometry, no app chrome, correct masthead, currency alignment
- Verify: `@media print` hides navigation, sidebar, bottom bar
- Test: Chrome, Safari, Firefox print

#### P6.3 — Accessibility pass
- Tab through every page: verify focus ring visible on all interactive elements
- Verify: all form inputs have labels
- Verify: status never communicated by color alone (check stage pills, status badges)
- Verify: `prefers-reduced-motion` respected (no decorative animations)
- Run Lighthouse accessibility audit, target ≥95

#### P6.4 — Icon set generation
- From `public/brand/seine-logo-source.png`:
  - Create simplified mark with transparent background
  - Generate: favicon (16, 32), apple-touch-icon (180), pwa-192, pwa-512, maskable (512 with padding)
  - Test contrast at 16×16 (favicon — hardest size)
  - Do NOT auto-trace: smallest sizes need hand-redrawing

#### P6.5 — Offline hardening
- Verify: `registerType: 'prompt'` in vite-plugin-pwa config
- Verify: no write-conflict resolution by last-write-wins for financial data
- Test: offline → create draft → come online → sync
- Test: financial operations (invoice finalize, payment record) blocked offline

#### P6.6 — Vocabulary audit
- Grep codebase for deprecated terms:
  - `pieceDescription` in repair context → should be `itemDescription` or similar
  - `lot` in UI labels → should be `stock batch`
  - `Net capital` → should be `Total cost`
  - `Brand value` → should be `Markup`
  - `consultation`, `sourcing`, `closed` as stages → should be mapped to new stages

### Acceptance criteria
- All pages pass mobile audit (no horizontal scroll, touch targets ok)
- Print output correct for all 3 document types
- Lighthouse accessibility ≥95
- Icon set generated and verified at all sizes
- Offline financial operations correctly blocked
- Zero deprecated vocabulary terms in UI

### Handoff artifact
- Mobile/print/a11y audit report
- Generated icon files in `public/brand/icons/`
- Updated PWA manifest
- Vocabulary audit report

---

## Agent context packs

Each agent receives ONLY these documents + the wave spec above:

### Wave 0 (DB agent)
```
CLAUDE.md (Design system, Data rules, Security)
CONTEXT.md (full glossary)
docs/adr/0003-piece-project-invoice-model.md
docs/plans/data-workflow-and-domain.md (D2, D5, D6, D7, D12, D26 sections)
```

### Wave 1 (UI agent)
```
CLAUDE.md (Design Rationale, Interaction Rules, Mobile Application Shell)
project.md (Design Rationale, Existing Visual Foundation)
CONTEXT.md (Design Language section only)
docs/adr/0001-phase-2-ui-foundation.md
docs/adr/0002-shared-document-canvas.md
```

### Wave 2 (Full-stack agent)
```
CLAUDE.md (Design Rationale, Assisted Data Entry)
CONTEXT.md (Piece, Catalog, SKU definitions)
project.md (Pricing Calculator section)
docs/adr/0003-piece-project-invoice-model.md
docs/plans/data-workflow-and-domain.md (D9, D25, D26, D27 sections)
```

### Wave 3 (Full-stack agent)
```
CLAUDE.md (Data rules, Design Rationale)
CONTEXT.md (Quote, Pricing, Project, Invoice, Payment, DocumentCanvas)
project.md (Pricing Calculator, Functional Scope §0)
docs/adr/0002-shared-document-canvas.md
docs/adr/0003-piece-project-invoice-model.md
docs/plans/data-workflow-and-domain.md (D4, D10-D15, D21-D24, D28-D31)
```

### Wave 4 (Full-stack agent)
```
CONTEXT.md (Event, Stock movement, Reservation, Available quantity, Studio buffer, Expense)
docs/adr/0003-piece-project-invoice-model.md
docs/plans/data-workflow-and-domain.md (D5, D8, D18, D19, D20)
```

### Wave 5 (Full-stack agent)
```
CONTEXT.md (Certificate, Repair, Client)
docs/adr/0002-shared-document-canvas.md
docs/adr/0003-piece-project-invoice-model.md
docs/plans/data-workflow-and-domain.md (D6, D7, D15, D16)
project.md (Accounting section)
```

### Wave 6 (UI + QA agent)
```
CLAUDE.md (full)
project.md (Mobile Application Shell, Interaction Rules, Brand Direction)
CONTEXT.md (Design Language)
docs/adr/0001-phase-2-ui-foundation.md
```

---

## Controller responsibilities

The controller (this session) is responsible for:

1. **Gatekeeping:** No wave starts until the previous wave's handoff artifact is verified.
2. **ADR compliance:** Any agent finding that contradicts an ADR must be escalated, not silently overridden.
3. **Glossary enforcement:** Agent output using deprecated vocabulary is rejected.
4. **Doc updates:** After each wave completes, the controller updates:
   - `docs/plans/data-workflow-and-domain.md` — mark completed decisions
   - `CONTEXT.md` — add/refine terms discovered during the wave
   - `docs/adr/` — create new ADR if a new architectural decision was made
5. **Integration verification:** After Waves 0-5, the controller runs the full quote→payment flow end-to-end before authorizing Wave 6.

---

## Sequencing rationale

| Wave | Why here |
|------|----------|
| 0 first | All waves need the new columns. DB work is pure risk — get it right once. |
| 1 second | UI primitives (type-scale, combobox, ResponsiveTable) are pre-requisites for every page built in Waves 2-5. |
| 2 third | PiecePicker is a dependency of Waves 3 (pricing), 4 (event stock pull), and 5 (repair link). |
| 3 fourth | The quote→project→invoice spine is the critical path. Everything in Waves 4-5 references it. |
| 4 fifth | Event sales need invoices working (Wave 3) and PiecePicker (Wave 2). |
| 5 sixth | Traceability links need all entities working (Projects from Wave 3, Events from Wave 4). |
| 6 last | Polish can only happen when all features are in place. |

---

## Estimated agent turns per wave

| Wave | Agent | Est. turns | Risk |
|------|-------|-----------|------|
| 0 | DB agent | 6-8 | Medium (enum migration) |
| 1 | UI agent | 8-12 | Low (mechanical refactor) |
| 2 | Full-stack agent | 10-14 | Low (new page, existing API) |
| 3 | Full-stack agent | 14-20 | High (core workflow rewrite) |
| 4 | Full-stack agent | 8-12 | Medium (new flow, depends on Wave 3) |
| 5 | Full-stack agent | 8-12 | Medium (depends on Waves 3+4) |
| 6 | UI + QA agent | 6-10 | Low (audit pass) |

**Total estimated: 60-88 agent turns** across 7 waves.
