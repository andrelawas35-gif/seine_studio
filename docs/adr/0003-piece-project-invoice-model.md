---
status: accepted
---

# Piece, Project, and Invoice as distinct, linked records

A **piece** (the reusable design/product, today's `catalogPieces`) and a **project**
(a client commission tracked through stages) are kept as separate entities rather
than merged into one "piece" or "project" concept. A piece is referenced by many
uses — commissions, stock lots, event sales, certificates — so its design details
live in one place and are never duplicated per sale. A project optionally references
the piece it reproduces (`project.catalog_piece_id`, nullable; primary in the UI
because most commissions reuse a design).

## Considered options

- **Merge everything into one concept.** Rejected: a reused design (e.g. one sold as
  a commission, as stock, and again to another client) would become many rows, each
  duplicating the design's materials and base price — increasing redundancy, the
  exact problem we set out to remove, and breaking inventory's reference to a single
  design.

## Consequences

- **Billing:** a project is billed by **multiple invoices** (deposit + final), not
  one with two payments. `invoice.project_id` already allows this. A project's
  balance derives from its accepted **quote** total minus payments across all its
  invoices — never a stored number.
- **Event sales:** a new nullable `invoice.event_id` lets a direct event sale (no
  project) attach to an event; `invoice.event_id` is the authoritative event
  attribution for finance, superseding the earlier through-project invoice filter.
- **Certificates:** a new nullable `certificate.project_id` gives traceability
  (project ↔ certificate) while the printed document still renders from its
  immutable snapshot.
- The word "piece" is reserved for the design entity; a repair's *item description*
  (the client's existing jewelry) and a pricing *label* are not pieces.

See [`docs/plans/data-workflow-and-domain.md`](../plans/data-workflow-and-domain.md)
for the full workflow and sequenced build steps, and [`CONTEXT.md`](../../CONTEXT.md)
for the glossary.
