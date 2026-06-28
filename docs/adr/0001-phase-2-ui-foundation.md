# 0001 — Phase 2 UI foundation: type-scale floor, shared primitives, light-only launch

- Status: Accepted
- Date: 2026-06-27
- Deciders: Owner (24-year-old designer-operator), Developer

## Context

Phase 1 shipped working operational pages, but a launch-readiness UI/UX audit
surfaced three foundation gaps that Phase 2 (quotes, invoices, payments,
expenses, reports) would otherwise inherit and multiply:

1. **Eye-straining type.** 251 text instances render below 11px (33 at 8px,
   126 at 9px, 92 at 10px). This violates the project's own principle to
   "privilege legibility over atmosphere" and fails accessibility comfort on
   phone/iPad. Minimalism here means whitespace and proportion, not tiny text.
2. **Unused primitive library.** A complete shadcn/ui set exists in
   `src/app/components/ui/` (`command`, `sheet`, `table`, `skeleton`, `drawer`,
   etc.), but operational pages hand-roll native `<select>` elements and bespoke
   micro-text widgets. The "Assisted Data Entry / searchable combobox" principle
   is therefore not actually implemented.
3. **Unthemed dark mode.** `theme.css` `.dark` is generic gray `oklch()`, which
   contradicts the principle "never a cold gray application shell."

## Decision

Build the UI foundation **before** Phase 2 features, so Phase 2 inherits it.

1. **Type-scale tokens with a hard floor.** Introduce semantic type tokens and
   refactor away every sub-11px size:
   - `eyebrow` — 11px, uppercase, `0.08em` tracking, medium. The only place 11px
     is allowed (museum-label micro caps).
   - `caption` — 12px. Timestamps, meta, secondary data.
   - `body` — 14px. Default reading size.
   - `body-lg` — 15px.
   - `input` — 16px on viewports ≤640px (prevents iOS Safari focus-zoom), 15px
     desktop.
   - Playfair display scale (`h1`–`h4`) is unchanged.
   The goal is to remove strain while keeping editorial density — panels look
   nearly identical; only the 8–9px captions become legible.

2. **Adopt the existing primitives.** Replace native `<select>` with `command`
   (searchable combobox), use `sheet` for mobile create-flows, `table` +
   `skeleton` for lists, so accessibility, focus states, and assisted entry come
   for free.

3. **`ResponsiveTable` primitive.** A single component that renders a calm table
   ≥768px and collapses to summary cards below it (principle line 102). All
   **summary tables** — side-by-side data for comparison (P&L rows, dashboard
   recents, cost-line grids) — render through it. **Record indexes** — browsable
   master-detail lists of domain objects (invoices, quotes, expenses) — are a
   separate interaction pattern; they do not use `ResponsiveTable`.
   *(Amended 2026-06-28: the original "All Phase 2 financial lists" was
   overloaded — it conflated two distinct layout patterns. This revision
   scopes ResponsiveTable to summary tables only.)*

4. **Light-only at launch.** Remove `.dark` theme switching so the cold-gray
   shell can never appear. A properly authored warm-charcoal "evening Louvre"
   dark theme is deferred to a post-launch upgrade.

## Consequences

- Phase 2 forms and tables get assisted entry, responsiveness, and a legible
  type scale without re-deriving them per feature.
- One-time refactor cost across existing Phase 1 pages to adopt the tokens and
  primitives.
- Dark mode is explicitly out of scope for launch; revisit as an upgrade with a
  brand-correct palette, not the current generic gray.

## Alternatives considered

- **Features first, retrofit later** — rejected: higher rework risk and the
  bespoke tiny-text pattern would propagate before it could be corrected.
- **Build branded dark mode now** — rejected for launch: doubles design/test
  surface across every screen for a two-user private tool.
