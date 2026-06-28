# Plan — Data Workflow & Domain Clarity

**Status:** Planning complete (2026-06-28). Session 1 fixed the **model** (D1–D9);
session 2 walked **each component** for workflow/UX confusion (D10–D20); session 3
walked the **add/edit forms** for confusion and workflow alignment (D21–D24); session 4
designed the new **Catalog / Pieces page** (D25–D27); session 5 untangled the **pricing
calculator** (D28–D31). Recorded
in [`CONTEXT.md`](../../CONTEXT.md) and [`ADR 0003`](../adr/0003-piece-project-invoice-model.md).
Build plan below is sequenced in 5 phases, each shippable on its own.
**Goal:** One clear workflow across all components, no redundant concepts, so the
two-user studio always knows which record is the source of truth.

> **Multi-agent execution plan:** [`multi-agent-build-plan.md`](./multi-agent-build-plan.md)
> maps the 5 phases below into 7 context-engineered waves with agent assignments,
> context packs, and handoff artifacts. Wave 0 (schema migrations) must run first;
> Waves 1-5 map to Phases A-E below with UI foundation inserted as Wave 1.

This document is built up *during* a grilling session. Decisions are recorded as
they land; open questions are worked one at a time. The domain glossary lives in
[`CONTEXT.md`](../../CONTEXT.md) — this plan holds the reasoning and the build steps.

---

## The two confusions we're resolving

### 1. Project vs. "piece"

"Piece" currently means five different things in code:

| Where | Meaning today | Same as catalog piece? |
|---|---|---|
| `catalogPieces` table | A product/design with a SKU (the formal entity) | — (this is it) |
| `certificate.pieceName` | Immutable text snapshot on an issued certificate | No (snapshot) |
| `repair.pieceDescription` | The client's *existing* jewelry being repaired | No |
| `pricing.pieceName` | Free-text label of the thing being priced | Unclear |
| Glossary "Project" | "a custom commission or collection **piece**" | Conflated |

A **Project** is a *job* (a commission tracked through stages). A **catalog
piece** is a *product/design*. There is currently **no link between them**, and no
link from a Certificate back to the Project that produced the piece.

### 2. Invoice ↔ Project links

- `invoice.projectId` is optional; `invoice.quoteId` is optional; `invoice.clientId`
  is required. There is no direct `invoice.eventId`.
- Unclear rules: when is `projectId` set? One project → many invoices (deposit +
  balance)? Can one invoice cover several projects/pieces? How do event walk-up
  sales (no project) get attributed?

---

## Decisions (filled in as we grill)

- **D1 — Don't merge Project and Piece.** They are different axes: a **Piece** is a
  reusable *design/product* (one record, referenced by many uses); a **Project** is
  a *commission job* for one client. Merging would duplicate the design across
  every commission / stock batch / event sale — the opposite of the goal.
  _Scenario that settled it: "Twisted Pearl Ring" sold as a commission to Maria, as
  5 stock units, and again to Ana = **one Piece**, referenced by many jobs/sales._
- **D2 — Project → Piece link is optional but primary.** Most commissions reproduce
  a catalog piece, so the link is prominent in the UI; truly bespoke one-offs may
  leave it empty (nullable FK `project.catalog_piece_id`). Requires a new column —
  projects don't reference pieces today.
- **D3 — Reserve the word "piece" for the design entity.** Rename the loose uses:
  `repair.pieceDescription` → item description (client's existing jewelry);
  pricing "piece name" stays a free-text label but is not the Piece entity.
- **D4 — A project is billed by *multiple* invoices (deposit + final), not one.**
  One project → many invoices. The agreed price comes from the project's accepted
  **quote**; the deposit and final balance are **separate invoice documents**, each
  settled by its own payment record(s). Project balance = accepted-quote total −
  payments across all the project's invoices. `invoice.projectId` already supports
  this (no unique constraint); no schema change needed for the link itself.
  _Note: supersedes the old glossary hint that deposit + balance are two payments
  on one invoice._
- **D5 — Add nullable `invoice.event_id` for direct event sales.** A walk-up event
  sale = an invoice with `eventId` set and `projectId` empty; line items reference
  the pieces sold from stock. Event finance queries invoices by `eventId` directly.
  Reconsiders the through-project invoice filter added in the earlier finance fix:
  `invoice.eventId` becomes the authoritative event attribution; the project→event
  join is kept only if commission revenue should also count toward an event.
- **D6 — Certificate links to the project (and piece), snapshot still prints.** Add
  nullable `certificate.project_id` alongside the existing piece + client links.
  The printed certificate renders from its immutable snapshot; the links are for
  navigation/traceability (project ↔ certificate, certificate → sale).
- **D7 — Repairs are standalone, with an optional own-piece/project link.** The item
  description stays free-text (external jewelry), but a repair may link to the
  piece/project the studio originally made, tying aftercare to the original sale.
  Add nullable `repair.catalog_piece_id` and `repair.project_id`.
- **D8 — Event revenue = direct sales only.** Event finance counts invoices with
  `invoice.event_id` set (sold on the spot). `project.event_id` is **origin
  metadata only** — a commission lead taken at an event reports under its
  client/project, never event P&L. Confirms D5: the through-project invoice filter
  added earlier is replaced by querying `invoice.event_id`.
- **D9 — Pieces get a dedicated Catalog/Pieces page.** Piece is the central reusable
  entity but has no UI home today (only a `/catalog` API). A management page to
  create/browse/edit pieces is a **prerequisite** for the Project→Piece picker.

## Resolved workflow (the clear path between components)

```
                 ┌───────────────────────────── PIECE (design / product) ──────────────┐
                 │  SKU · materials · metal/karat · base retail & cost                  │
                 │  one piece, referenced by many uses (no duplication)                 │
                 └───────┬───────────────┬────────────────────────────┬────────────────┘
                         │ referenced by │ stocked as                 │ certified as
                         ▼               ▼                            ▼
   CLIENT ── QUOTE ──► PROJECT      INVENTORY LOTS              CERTIFICATE
   (pricing  (accepted  (commission  (on-hand from movements)   (snapshot + links
    version)  → agreed   job, stages)                            to piece + project)
              price)        │                                         ▲
                            │ billed by                               │ traceable to
                            ▼                                         │
                    INVOICES (deposit + final)  ──────────────────────┘
                       │  projectId set (commission)
                       │  eventId set  (direct event sale, no project)
                       ▼
                    PAYMENTS  → project/event balance is derived
                                 (agreed total − payments)
```

- **Commission path:** Client → Quote (pricing) → accept → Project (references the
  Piece) → deposit Invoice + final Invoice → Payments → Certificate (links Piece +
  Project).
- **Event/stock path:** Piece → Inventory lots → sold at Event → Invoice
  (`eventId` set, no project, line items = pieces) → Payments → Certificate (Piece
  + client).
- **Single source of truth:** design details on the Piece; agreed price on the
  accepted Quote; money on Invoices/Payments; on-hand on stock movements. Nothing
  is duplicated across components.

## Build steps (sequenced in phases, each shippable on its own)

Steps marked **[migration]** need a schema change applied via the Neon SQL API
(not `drizzle-kit migrate`), per `docs/post-deployment-fixes.md`.

> **Agent assignment legend:** W0 = Wave 0 (DB agent), W1 = Wave 1 (UI agent),
> W2–W5 = Waves 2–5 (Full-stack agents), W6 = Wave 6 (UI+QA agent).
> See [`multi-agent-build-plan.md`](./multi-agent-build-plan.md) for full task specs.

**Phase A — Vocabulary (low risk, no/▪ minimal schema).** `[W1 + W6]`
1. Reserve "piece" for the design entity. Rename repair `pieceDescription` UI label
   → "Item description" (D3); rename "lot" → "Stock batch" everywhere user-facing
   (D17). Pure UI. `[W1: implement, W6: audit]`

**Phase B — Catalog foundation (unblocks every piece picker).** `[W2]`
2. **Catalog / Pieces page** over the existing `/catalog` API — create/browse/edit
   pieces (SKU, materials, base price). (D9) `[W2: F2.1–F2.4]`
3. **Finished-piece stock batches link to a piece** — add the catalog-piece picker
   to the batch form when kind = `finished_piece`; show on-hand per piece. Uses
   existing `inventory_lots.catalog_piece_id`. (D18) `[W4: F4.2]`

**Phase C — Quote → Project → Invoice spine.** `[W3]`
4. **Embed pricing in the quote flow** — quote builder with costed line items +
   markup → saves a pricing version; deprecate the Accounting Pricing tab. (D14) `[W3: F3.1]`
5. **Quote-first conversion** — "Convert to project" creates a project pre-linked to
   the quote/client/piece; project-first as fallback. (D10) `[W3: F3.2]`
6. **Project model cleanup** — **[migration]** add `projects.catalog_piece_id` (D2)
   and slim the `project_stage` enum 11→7 with row mapping (D12); auto-generate
   project numbers (D11); show linked piece on project detail. `[W0: M0.2+M0.3, W3: F3.3]`
7. **Invoices from a project** — deposit + final invoices inherit accepted-quote
   amounts (override allowed); replace `depositPercent`-on-one-invoice; project
   balance derived from quote total − payments. (D4, D13) `[W3: F3.4]`

**Phase D — Events & sales.** `[W4]`
8. **Invoice → Event** — **[migration]** add `invoices.event_id`; event finance
   queries by it; remove the through-project filter from the earlier fix. (D5, D8) `[W0: M0.4, W4: F4.1]`
9. **Event "Record sale"** — pick finished pieces from stock + client → invoice
   (`eventId`) + stock-out movement + payment, one action. (D20) `[W4: F4.1]`
10. **Expenses attachable to project/event + guided COGS** — add the picker (FKs
    already exist); category-based COGS default + guidance. (D19) `[W4: F4.3]`

**Phase E — Traceability & 360 views.** `[W5]`
11. **Certificate → Project** — **[migration]** add `certificates.project_id`;
    surface on cert form + project detail. (D6) `[W0: M0.5, W5: F5.1]`
12. **Repair → optional own-piece/project** — **[migration]** add
    `repairs.catalog_piece_id` / `repairs.project_id`; optional picker. (D7) `[W0: M0.6, W5: F5.2]`
13. **Client 360 view** — `/clients/:id` returns linked projects/quotes/invoices/
    repairs/certs + derived lifetime spend & balance; render sections. (D16) `[W5: F5.3]`
14. **Accounting = finance dashboard** — remove the Pricing tab + dead
    `accountingData.ts` mock layer; rename its first tab "Financial summary". (D15) `[W5: F5.4]`

**Cross-wave dependencies:**
- Lifecycle edit-locking (D24) spans W3 (quotes/invoices) + W5 (certificates) `[W3: F3.5, W5: F5.1]`
- DocumentCanvas rendering spans W3 (quotes/invoices) + W5 (certificates) `[W3: F3.6, W5: F5.5]`
- Vocabulary audit (D3, D17, D29) implemented in W1 + verified in W6 `[W1: U1.1, W6: P6.6]`
- UI primitives (type-scale, combobox, ResponsiveTable) are W1 pre-requisites for all later waves `[W1: U1.1–U1.5]`

## Component workflow decisions (session 2 — per-component pass)

- **D10 — Quote-first is the spine; "Convert to project" wires the links.** Price a
  quote (client + piece + amount) → client accepts → one click **Convert to
  project** creates the project pre-linked to the quote, client, and piece;
  invoices are then created *from* the project (auto-setting `invoice.project_id`).
  Project-first remains a fallback, but the default path means links populate
  themselves instead of the user wiring pickers by hand. Resolves the dangling
  quote `converted` status (accept → convert) and gives D4's balance derivation
  real linked invoices to sum.

- **D11 — Auto-generate project numbers** (e.g. `PRJ-0001`) on create/convert, like
  invoices and quotes. Removes the manual required field; consistent numbering.
- **D12 — Slim project stages from 11 → 7.** Canonical: **Inquiry → Design →
  Approved → Production → QA → Ready → Delivered**, with **Cancelled** as a side
  state. Fold `consultation`→inquiry and `sourcing`→production; drop `closed`
  (Delivered is terminal). Requires a `project_stage` enum migration + mapping of
  existing rows; update `STAGE_ORDER`/labels/colors in `projects.ts`.
- **D13 — Invoice amounts inherit from the accepted quote (override allowed).** The
  project's agreed price is the accepted quote total. **Deposit invoice** =
  `depositPct × total`; **final invoice** = remainder. Pre-filled, editable if
  reality differs. Replaces the `depositPercent`-on-one-invoice model with D4's
  separate invoices. (Event-sale invoices instead take line items from the pieces
  sold, priced at `piece.retailPriceCents`.)
- **D14 — Pricing is embedded in the quote flow.** Building/editing a quote *is*
  pricing it: pick client + piece, add costed line items + markup → saves a
  pricing version on the quote. The standalone Accounting "Pricing" tab becomes an
  optional scratchpad (or is removed). One canonical place to make a priced quote;
  ends the Accounting↔Quotes split.
- **D15 — Accounting is the finance/P&L dashboard, nothing else.** It shows the
  money view (collected, outstanding, COGS vs OPEX, net profit, trends) derived
  from invoices/expenses. Remove the Pricing tab (→ Quotes) and the dead
  `accountingData.ts` mock layer; rename its first tab "Financial summary" so it
  doesn't collide with the operations **Overview**. Operations stay on Overview.
- **D16 — Client detail is a 360 view.** Surfaces the client's linked projects,
  quotes, invoices (with balance), repairs, and certificates, plus derived lifetime
  spend and outstanding balance — all from source records. The `/clients/:id` API
  must return these (today it returns only `{ client, activity }`).
- **D17 — Rename "lot" → "Stock batch" in the UI.** "Lot" is warehouse jargon that
  confused even the owner. Keep the internal schema name (`inventory_lots`) but
  label it "stock batch" everywhere user-facing. A stock batch = one received batch
  of a material or finished item, with its own unit cost; on-hand derives from its
  movements.
- **D18 — Finished-piece stock batches link to their catalog piece.** When a batch's
  kind is `finished_piece`, the form requires picking the catalog piece it stocks;
  materials/packaging don't. Makes on-hand-per-piece derivable and lets event sales
  pull finished pieces from stock. Uses the existing `inventory_lots.catalog_piece_id`.
- **D19 — Expenses are attachable to a project or event, with guided COGS.** The
  expense form gets an optional project/event picker (schema already has both FKs),
  enabling per-project margin and feeding event finance. The `isCogs` toggle gets a
  category-based default + inline guidance (materials/production = COGS, overhead =
  OPEX).
- **D20 — One "Record sale" action for events.** On the event page: pick finished
  pieces from stock + client (or walk-in) → creates an invoice (`eventId` set),
  prices from each piece's retail, records a stock-out movement (on-hand drops), and
  logs payment. One action wires sale + stock + finance together. Ties D5, D13, D18.

### Session 3 — add/edit forms (D21–D24)

- **D21 — Project creation: convert-primary + one slim direct form.** "Convert to
  project" from an accepted quote is the main path (pre-fills client + piece + links
  the quote). A single stripped-down "Create project directly" stays for jobs with no
  quote (informal start, internal/stock run). Both land in the *same* simplified form:
  auto project number (D11), **no stage picker** (new project = inquiry), client +
  **piece** (D2) + target date + brief. Removes the manual `projectNumber` field and
  the create-time stage picker that exist today in
  [`ProjectsPage.tsx`](../../src/app/components/ProjectsPage.tsx). Ties D2, D10, D11.
- **D22 — Quote create stays minimal; pricing lives in the quote detail (derived
  from the versioned model).** A pricing version attaches to an *existing* quote
  (`quote.pricingVersionId` + snapshots), so the create modal can only collect client
  + deposit% + terms; the relocated `PricingCalculator` becomes the quote-detail
  pricing-version editor. An empty quote is a transient draft state. Implements D14/D15;
  no separate question needed — the data model dictates create-then-price.
- **D23 — Invoices are billed from a project, with a Deposit/Balance choice.**
  "Create invoice" launches from a project and asks **Deposit** (pre-fills deposit% ×
  accepted-quote total) or **Balance** (pre-fills quote total − already-invoiced).
  Amounts inherit from the quote, overridable (D13); each is its own invoice (D4).
  Standalone create is kept **only** for direct/event/walk-in sales (no project,
  `event_id` per D5). Removes today's hand-typed subtotal/discount/tax with no project
  link in [`InvoicesPage.tsx`](../../src/app/components/InvoicesPage.tsx). Ties D4, D5, D13.
- **D24 — Lifecycle edit-locking enforces immutability.** Each document locks when it
  becomes binding: a **Quote** locks at Accepted (changes require a new version or new
  quote), an **Invoice** locks at Issued (then only payment / void / refund), a
  **Certificate** locks at Issued (changes = new revision). Projects/Clients stay
  editable as living records; **stage** is the only lever for production progress.
  Enforces the immutability rules already stated in `CONTEXT.md` for Invoice, Payment,
  and Certificate.

**Cross-cutting observation (not a domain decision):** add/edit UX is split across two
patterns — full-page form with offline `DraftShelf` (Projects, Clients, Inventory) vs.
simple API-only create modal (Quotes, Invoices, Expenses, Repairs, Certificates). Worth
converging during the build for a consistent "add" experience and PWA offline-draft
parity, but it's an implementation-consistency item, not a model decision.

### Session 4 — the new Catalog / Pieces page (D25–D27)

The catalog **API already exists** (`functions/api/catalog/index.ts` + `[pieceId].ts`:
list/search, create, detail, patch, archive) but there is **no UI**. These decisions
define that page. Schema today: `sku, name, category, collection, metalType, karat,
stoneSummary, retailPriceCents, costCents, archivedAt`.

- **D25 — Catalog is a design hub / 360 view.** Browse the design library; each
  piece's detail shows its attributes plus every usage — projects made from it,
  finished-piece **stock on-hand** (derived from D18 batches), certificates issued,
  and **units sold + revenue**. Mirrors the client 360 (D16); makes "piece" visibly
  the center of the model. (Rejected: a flat product list, and folding into Inventory —
  the latter re-mixes design with stock, the separation D17/D18 drew.)
- **D26 — Image-forward via a URL field. [migration]** Add a nullable
  `catalog_pieces.image_url`. The list is a **card grid** with a photo thumbnail;
  detail shows a larger image. Images are referenced by pasted URL (hosted/Instagram/
  Drive) — no upload infra now; R2 upload can come later behind the same field.
- **D27 — Retail = default price; cost = labeled estimate.** `retailPriceCents` is the
  design's default list price and **pre-fills** a quote/sale line when the piece is
  picked. `costCents` is kept but surfaced as **"estimated / standard cost"** — a
  planning input for margin preview at design time, never presented as "the cost".
  **Actual COGS/margin always derives** from real stock unit cost + expenses. Avoids
  the duplicate-cost trap by naming the estimate honestly.

**Recommendations folded in (no separate decision):**
- **SKU** — manual, required, unique (a brand artifact the owner controls, unlike the
  auto project number of D11).
- **Category** — a controlled preset list (Ring, Necklace, Earrings, Bracelet, Pendant,
  Brooch, Other) for clean grid filtering, not free-text. `collection` stays optional
  free-text grouping.
- **Create/edit form** — image URL, SKU, name, category, collection, metal/karat,
  stone summary, retail price, estimated cost. Follows the lifecycle: pieces are living
  reference records (editable; archive, never hard-delete — API already supports it).
- **Nav** — top-level **"Catalog"**, placed next to Inventory.
- **Build order** — slots into **Phase B** (catalog foundation), *before* the
  Quote→Project→Invoice spine that pre-fills from a piece's retail.

### Session 5 — the pricing calculator (D28–D31)

`PricingCalculator.tsx` + `pricing.ts` reviewed in full. The model is sound (cost
lines → markup → discount → selling price; gross profit/margin derived) but the
component is confusing and disconnected from the workflow.

- **D28 — The calculator folds fully into the quote. [migration]** It *becomes* the
  quote's pricing-version editor: "Save version" writes a pricing version **to the
  quote**, and the quote document renders from it. **Retire** the parallel stores —
  the standalone `/pricing` `SavedCalculation` API, the `localStorage`
  `seine.pricing-versions.v1` history, and the `onPrepareQuote` handoff (you're already
  in the quote). One source of truth = the quote's pricing versions. A pre-client
  ballpark is just a **draft quote**. Implements D14/D22; removes a whole second
  versioning system.
- **D29 — Plain finance terms.** `Net capital` → **"Total cost"**; `Brand value` →
  **"Markup"** (the amount added on top of cost). Keep "Gross profit" + "margin %" as
  the outcome. The summary reads cost → + markup → − discount → selling price → profit/
  margin. Removes the "Brand value vs Gross profit" near-duplicate confusion.
- **D30 — Commission-only, with a catalog-piece reference.** The calculator prices
  *custom/commission* work (cost lines → markup). Replace the free-text "Piece or
  service" with a **catalog-piece reference**: pick the design → pre-fills the name,
  links quote→piece (→project→piece on convert, D2), and shows the piece's **retail as
  a benchmark** beside the computed price. Selling an **existing** design does **not**
  go through the calculator — it's a direct invoice / event record-sale at retail
  (D20/D23). One job per tool.
- **D31 — Soft target-margin guardrail.** A configurable **target margin %** (default
  ~50%). If the computed margin falls below it, show an amber "below your target margin"
  warning — informative, never blocks (legitimate VIP discounts / loss-leaders stay
  possible). Extends today's zero/negative-profit warning.

**Recommendations folded in (no separate decision):**
- **Live materials** — drop the hardcoded `TRACKER_SUGGESTIONS`; material lines pull
  from **live inventory** (real unit cost + on-hand), so a cost line traces to a stock
  batch.
- **CSV tracker import** — a one-time migration aid from the old spreadsheet; keep it
  but tuck it behind a low-prominence "Import" affordance now that pricing lives in
  quotes.
- **Price rounding** — optional snap of the selling price to a tidy figure (e.g.
  nearest ₱100).
- **Build order** — lands in **Phase C** (the Quote→Project→Invoice spine), since D28
  makes pricing part of the quote editor.

### Components reviewed with no new decision

- **Certificates** — gap was the project link (D6); issue-from-project + immutable
  snapshot otherwise fine. Create form covered by D6 + D24.
- **Repairs** — item rename (D3) + optional own-piece/project link (D7) cover it.
- **Reply Templates** — a copy/paste aid; already wired to live reference data; the
  "piece type" field is a free-text label (D3), not the Piece entity.
- **Overview** — rebuilt earlier (live metrics + calendar); no workflow confusion.
- **Expenses** — add/edit fully specified by D19 (project/event picker + category-driven
  COGS default). No new judgment.
- **Clients** — create/edit form is clean: no derived fields leak in (spend/balance live
  only in the D16 360 view).
- **Inventory** — new-batch + movement forms covered by D17 (rename) + D18 (piece picker
  when Kind = finished piece); movements correctly append-only (no on-hand edit).

## Open questions

_Model questions resolved in session 1. Component-level questions are being worked
one at a time in session 2._

---

## Decision → Wave mapping (for agent dispatch)

| Decision | What | Wave |
|----------|------|------|
| D1 | Piece ≠ Project (separate entities) | Model (done) |
| D2 | `projects.catalog_piece_id` | **W0** (M0.2) |
| D3 | Reserve "piece" word | **W1** (label rename) + **W6** (audit) |
| D4 | Project billed by multiple invoices | **W3** (F3.4) |
| D5 | `invoices.event_id` | **W0** (M0.4) + **W4** (F4.1) |
| D6 | `certificates.project_id` | **W0** (M0.5) + **W5** (F5.1) |
| D7 | `repairs.catalog_piece_id` / `project_id` | **W0** (M0.6) + **W5** (F5.2) |
| D8 | Event revenue = direct sales only | **W4** (F4.1) |
| D9 | Catalog/Pieces page | **W2** (F2.1–F2.4) |
| D10 | Quote-first conversion | **W3** (F3.2) |
| D11 | Auto-generate project numbers | **W3** (F3.3) |
| D12 | Slim project stages 11→7 | **W0** (M0.3) + **W3** (F3.3) |
| D13 | Invoice amounts inherit from quote | **W3** (F3.4) |
| D14 | Pricing embedded in quote flow | **W3** (F3.1) |
| D15 | Accounting = finance dashboard | **W5** (F5.4) |
| D16 | Client 360 view | **W5** (F5.3) |
| D17 | Rename "lot" → "Stock batch" | **W1** + **W6** |
| D18 | Finished-piece batches link to piece | **W4** (F4.2) |
| D19 | Expense project/event picker + COGS | **W4** (F4.3) |
| D20 | Event "Record sale" one action | **W4** (F4.1) |
| D21 | Convert-primary project creation | **W3** (F3.2) |
| D22 | Minimal quote create, pricing in detail | **W3** (F3.1) |
| D23 | Invoice Deposit/Balance from project | **W3** (F3.4) |
| D24 | Lifecycle edit-locking | **W3** (F3.5) + **W5** (F5.1) |
| D25 | Catalog = design hub / 360 | **W2** (F2.2) |
| D26 | `catalog_pieces.image_url` | **W0** (M0.1) |
| D27 | Retail = default price, cost = estimate | **W2** (F2.2) |
| D28 | Calculator folds into quote | **W3** (F3.1) |
| D29 | Plain finance terms | **W3** (F3.1) |
| D30 | Commission-only, piece reference | **W3** (F3.1) |
| D31 | Target margin guardrail | **W3** (F3.1) |
