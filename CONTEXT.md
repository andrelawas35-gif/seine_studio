# Seine Studio — Domain Glossary

The ubiquitous language for the operations platform. Terms only — no
implementation details. When code or conversation uses one of these words, it
means exactly what is written here. Sharpen and add terms as the model evolves.

## Inventory & stock

- **Stock batch (lot)** — One batch of a single material or finished item received
  together and tracked as one record with its own unit cost; a later purchase at a
  different price is a new batch. The UI says **"stock batch"**; "lot" is the
  internal/industry term (table `inventory_lots`). On-hand per batch is derived from
  its stock movements. A finished-piece batch links to the **piece** it is stock of.
- **Stock movement** — An append-only, immutable record of a change in stock
  (e.g. receipt, sale, reservation). Movements are never edited or deleted;
  corrections are new movements.
- **On-hand quantity** — A lot's physical quantity, *derived solely from its
  stock movements*. It is never stored as a mutable number and never seeded from
  the lot's original size independently of the initial receipt movement.
- **Reserved quantity** — Stock committed to an event or order but not yet
  removed. A reservation reduces what is *available* without changing on-hand.
- **Available quantity** — On-hand minus reserved, further reduced by the
  **studio buffer** when planning an event pull.
- **Studio buffer** — A percentage of a finished piece's stock held back from
  event allocation so the studio is never fully drained for a single event.
- **Adjustment (increase / decrease)** — A directional manual correction to
  stock. `adjustment_increase` adds, `adjustment_decrease` subtracts. The old
  directionless `adjustment` is deprecated because a positive-only quantity
  cannot express which way the correction goes.
- **Transfer** — Movement of stock between locations. It does not change a lot's
  total on-hand, only where the stock sits.
- **Allocation** — The link between an event and the specific lot stock pulled
  for it; an accepted allocation creates a reservation movement.

## Catalog & pieces

- **Piece** — A reusable *design / product* the studio makes (today's
  `catalogPieces`), identified by a manually-assigned **SKU** and carrying its
  materials, metal/karat, stones, a reference **image**, a **retail price** (the
  design's default list price, which pre-fills quote/sale lines), and an **estimated
  cost** (a planning figure for margin preview — *not* actual COGS, which is always
  derived from real stock cost + expenses). **One piece is referenced by many uses** —
  commissions (projects), stock batches, event sales, and certificates — so design
  details live on the piece once and are never duplicated per sale. The canonical
  term; "design" is an accepted synonym when emphasizing reuse.
- **Catalog** — The page that presents pieces as a **design hub**: an image-forward
  card grid of the design library, and a per-piece **360 view** showing the piece's
  attributes plus every usage — projects made from it, finished-piece stock on-hand,
  certificates issued, and units sold with revenue. The catalog is the *design*
  library; **Inventory** is the *stock* of physical batches (a finished-piece batch
  links back to its piece). Distinct pages, one link.
- **Not a piece** — A repair's *item description* is the client's **existing**
  jewelry, not a studio design. A pricing "piece name" is a free-text label.
  Neither is the **Piece** entity above; the word is reserved for the design.

## Projects & events

- **Project** — A commission *job* for one client, tracked through stages from
  inquiry to closeout. It **optionally references the piece (design) it
  reproduces** — most commissions do; a fully bespoke project may reference none.
  Its **stage** describes *production* progress, never payment status. A project
  is one engagement; the piece it makes may be reused by other projects, stock,
  or events.
- **Project stage** — One of: inquiry, design, approved, production,
  quality_control, ready, delivered; with cancelled as a side state. (Slimmed from
  the older 11-stage set: consultation folds into inquiry, sourcing into
  production, and the redundant `closed` is dropped — delivered is terminal.)
- **Event** — A temporary selling occasion (market, trunk show, pop-up). An
  operational record with its own temporary location, not a calendar entry. Its
  **revenue is direct sales only** — invoices with `event_id` set (sold on the
  spot). A commission whose project merely *originated* at the event
  (`project.event_id`) is origin metadata, never event P&L.

## Sales & finance (Phase 2 vocabulary)

- **Quote** — A versioned, itemized *estimate* sent to a client. Becomes binding
  only on acceptance, when it may convert into a project and/or invoice. Pricing is
  edited as **pricing versions** attached to the quote; once **accepted**, the quote
  **locks** — a change requires a new version or a new quote, never a silent rewrite
  of what the client saw. The quote **is** the home of pricing — there is no separate
  pricing tool or store.
- **Pricing (cost build)** — How a **commission** is priced inside its quote:
  itemized cost lines (material, labor, design, packaging, outsourced, overhead) sum to
  the **Total cost**; a **Markup** is added; a **Discount** is subtracted → the
  **Selling price**. **Gross profit** = selling price − total cost; **margin %** =
  gross profit ÷ selling price. A configurable **target margin** raises a soft warning
  when undercut (never blocks). Cost lines draw from **live inventory** unit cost. The
  calculator prices *custom work only* — it references the **piece** being made (and
  shows its retail as a benchmark); selling an existing design is a direct invoice or
  event sale at retail, not a priced quote.
- **Invoice** — A *demand for payment* with a stable document number. A project is
  billed by **one or more invoices** — typically a deposit invoice and then a final
  invoice. Created by **billing a project** (choose *Deposit* = deposit% × accepted-quote
  total, or *Balance* = quote total − already-invoiced; amounts inherit, overridable);
  a standalone invoice is reserved for direct/event/walk-in sales (no project,
  `event_id` set). Once **issued** the invoice **locks** — afterward only payment,
  void, or refund. Finalized invoices are never deleted; they are voided or refunded
  with an audit trail.
- **Payment record** — One received payment against an invoice. An invoice may have
  several (e.g. partial then full). A project's **deposit and balance are separate
  invoices**, each settled by its own payment(s). Balance due is derived, never
  typed: project balance = accepted-quote total − payments across all its invoices.
- **COGS (cost of goods sold)** — The direct cost of pieces *actually sold*.
  Distinct from operating expense; stock allocated to an event is not COGS until
  sold.
- **Operating expense** — A business cost that is not a direct cost of a sold
  piece. Kept separate from COGS so margin and P&L stay meaningful.
- **Certificate of authenticity** — A branded, numbered document issued for a
  piece. Links to the **piece** and, for a commission, the **project** that
  produced it; for traceability only — the printed document renders from an
  *immutable snapshot*, so later edits to piece or project never alter an issued
  certificate. Once **issued** it **locks** — a change is a new **revision**, not an
  in-place edit. Revoked or reissued, never hard-deleted.
- **Repair** — An aftercare job on a client's **existing** item, described by free
  text (the item may be from another jeweler). It may **optionally** link to the
  studio's own piece/project when it's warranty work on something the studio made;
  that link is for traceability, not a requirement.

## Design language

- **Display case** — A single content panel. The guiding metaphor: each panel is
  a curated display case, not a storage bin — generous negative space, hairline
  borders, one clear focus.
- **Eyebrow** — An uppercase, letter-spaced micro-label (11px floor) used like a
  museum label beside an exhibit. The smallest permitted text in the app (except
  bottom-nav labels at 8px, a standard mobile nav convention).
- **Caption** — 12px secondary text for timestamps, meta, and supporting data.
  The next step above eyebrow.
- **Museum gold** — The single sparing accent (`--accent`). Used for active-nav
  hairlines, focus rings, and page-header eyebrows, never as a general-purpose
  status color.
- **Seine mark** — The `SeineMark` inline SVG component (`src/app/components/
  SeineMark.tsx`). Inherits `currentColor`; used in gold on the charcoal
  sidebar and in the mobile TopBar. Treat as a signature, never a repeating
  decorative motif.
