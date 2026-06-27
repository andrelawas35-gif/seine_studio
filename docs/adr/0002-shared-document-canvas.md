# 0002 — Shared DocumentCanvas for printable branded documents

- Status: Accepted
- Date: 2026-06-27
- Deciders: Owner, Developer

## Context

Three Phase 2/3 features each call for an "editable, branded HTML template with
Copy / Print / Duplicate": Quotes (§4), Invoices (§5), and Certificates of
Authenticity (§7). Built independently, they would drift in masthead, spacing,
currency formatting, paper size, and print behaviour — and each would need its
own `@media print` handling, which is easy to get subtly wrong.

PDF generation, email delivery, and pay-by-link are explicitly upgrade features;
the launch contract is browser print + copy.

## Decision

Build one shared **`DocumentCanvas`** component that all three document types
render their content into. It owns:

- Fixed A4 / US-Letter page geometry with print-safe margins.
- The Seine Studio serif masthead, hairline rules, and generous negative space
  (French Minimal / Louvre treatment), kept calmer than the public brand.
- A dedicated `@media print` stylesheet that hides the app shell, forces the
  light palette, and prints only the document.
- `font-variant-numeric: tabular-nums` for aligned currency columns.
- Snapshot rendering: documents render from an immutable data snapshot so later
  catalog/pricing edits never alter an already-issued document (required by §5,
  §7).

Quote, Invoice, and Certificate become thin content layouts that supply line
items, totals, and metadata; layout chrome and print behaviour live in
`DocumentCanvas`.

## Consequences

- Consistent, on-brand hand-off documents with one place to tune print output.
- Copy and Print work the same everywhere; Duplicate clones the snapshot.
- A future PDF/email upgrade has a single rendering target to hook into.
- Slightly more up-front design work than a one-off template, paid back by the
  second and third document type.

## Alternatives considered

- **Per-feature HTML templates** — rejected: guaranteed drift across three
  documents and triplicated print-CSS bugs.
- **Copy-to-clipboard only at launch, defer print** — rejected: hand-off
  documents (certificates especially) need to print cleanly on day one.
