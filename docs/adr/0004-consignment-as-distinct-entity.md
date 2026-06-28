# 0004 — Consignment is a distinct entity, not an Event variant

- Status: Accepted
- Date: 2026-06-27
- Deciders: Owner, Developer

## Context

The studio needs to track stock placed in consignment shops: long-lived partner
stores that hold Seine Studio stock for sale, with no start or end dates, tracked
by periodic (monthly) stock counts.

This resembles an **Event** (both hold studio stock at an external place), which
tempted reusing the Event entity with a "consignment" flag and null dates. But
the glossary defines an **Event** as a *temporary selling occasion* with its own
*temporary location* and dates. A dateless, indefinite consignment contradicts
that definition, and overloading Event would force every event query, calendar
view, and report to special-case the dateless variant.

## Decision

Model **Consignment** as its own first-class entity, separate from Event:

- A consignment is a long-lived partner shop (no dates).
- Stock placed on consignment remains the studio's until sold.
- A **consignment count** is a periodic snapshot of what is physically at the
  consignment — a recorded observation, not a stock movement.

Consignment and Event both build on the existing stock-allocation concept (stock
held at an external location), but they are distinct records with distinct pages.

See `CONTEXT.md` for **consignment** and **consignment count**.

## Consequences

- The Event glossary term stays clean (temporary, dated).
- Two pages/flows to maintain instead of one, but each stays simple and honest to
  its domain meaning.
- Reporting can treat "stock at events" and "stock at consignments" separately,
  which matches how the studio reasons about them.
- A consignment count is a snapshot, so reconciling it against derived on-hand
  (movement-based) is a deliberate, separate step — counts never silently rewrite
  the append-only movement history.
