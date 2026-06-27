# Seine Studio — Domain Glossary

The ubiquitous language for the operations platform. Terms only — no
implementation details. When code or conversation uses one of these words, it
means exactly what is written here. Sharpen and add terms as the model evolves.

## Inventory & stock

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

## Projects & events

- **Project** — A custom commission or collection piece tracked from inquiry to
  closeout. Its **stage** describes *production* progress, never payment status.
- **Project stage** — One of: inquiry, consultation, design, approved, sourcing,
  production, quality_control, ready, delivered, closed; with cancelled as a
  side state.
- **Event** — A temporary selling occasion (market, trunk show, pop-up). An
  operational record with its own temporary location, not a calendar entry.

## Sales & finance (Phase 2 vocabulary)

- **Quote** — A versioned, itemized *estimate* sent to a client. Becomes binding
  only on acceptance, when it may convert into a project and/or invoice.
- **Invoice** — A *demand for payment* with a stable document number. Finalized
  invoices are never deleted; they are voided or refunded with an audit trail.
- **Payment record** — One received payment against an invoice. An invoice may
  have many (deposit + balance). Balance due is derived, never typed.
- **COGS (cost of goods sold)** — The direct cost of pieces *actually sold*.
  Distinct from operating expense; stock allocated to an event is not COGS until
  sold.
- **Operating expense** — A business cost that is not a direct cost of a sold
  piece. Kept separate from COGS so margin and P&L stay meaningful.
- **Certificate of authenticity** — A branded, numbered document issued for a
  piece. Rendered from an immutable snapshot so later edits never alter an
  issued certificate; revoked or reissued, never hard-deleted.

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
