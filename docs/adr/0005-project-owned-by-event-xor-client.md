# 0005 — A Project is owned by an Event XOR a Client

- Status: Accepted
- Date: 2026-06-27
- Deciders: Owner, Developer

## Context

Projects currently reference a client only (`projects.clientId`). The studio also
runs projects *for an event* (pieces made for a market/trunk show, not a specific
client). A project made for an event should populate that event's stock/product
list. So a project needs to belong to either a client or an event.

Options: (a) keep client required and add an optional event tag; (b) make both
optional; (c) exactly one of the two, enforced.

Option (a) can't represent a true event-only project without a dummy client.
Option (b) permits orphan projects (neither owner) and ambiguous ones (both),
which every downstream report and the event-stock-population rule would have to
disambiguate.

## Decision

A project has exactly one **owner**: either an **event** or a **client** — never
both, never neither. Enforced at the database level (a CHECK that exactly one of
`client_id` / `event_id` is non-null) and in the form.

A project owned by an event contributes its pieces to that event's stock/product
list. A project owned by a client behaves as today.

See `CONTEXT.md` → **Project**.

## Consequences

- Existing client-owned projects are unaffected (their `event_id` is null).
- Reports and the event-stock rule can rely on a single, unambiguous owner.
- Migration must add `event_id` and the CHECK constraint; existing rows already
  satisfy it (client set, event null).
- If a project ever genuinely needed both an event and a client, that would be a
  new modeling decision (e.g. a client commission shown at an event) — out of
  scope here and deliberately disallowed for now.
