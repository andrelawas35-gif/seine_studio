# Phase 0 — Foundation Context Pack (agent-ready)

**Parent plan:** [`ux-and-adhd-build-plan.md`](./ux-and-adhd-build-plan.md) → Phase 0.
**Status:** Ready to build. **Agent profile:** Frontend / full-stack (one agent can own
the whole phase; F0.5–0.8 are independent and parallelizable).

This is a self-contained context pack: an agent should be able to consume *this file +
the referenced docs* and build Phase 0 without the full project history.

---

## 0. Mission

Make **"where am I and what state is the data in" live in the URL or a derived pure
function — never trapped in component state.** Deliver the foundation layer that
unblocks every later phase: URL-routed detail for all list pages, URL-encoded filters,
context-aware return + breadcrumb, scroll restoration, the `signals.ts` selector
module, and three shared primitives (`<EmptyState>`, status-severity, responsive
`Modal`).

## 1. Reference docs (read first, in order)

1. [`guardrails-common-errors.md`](./guardrails-common-errors.md) — **mandatory.** The
   failure modes below cite specific guardrails (G1–G9).
2. [`../adr/0005-ui-workflow-and-organization.md`](../adr/0005-ui-workflow-and-organization.md) — D-UI-8, D-UI-4, D-UI-11.
3. [`../adr/0007-navigation-and-ux-connective-tissue.md`](../adr/0007-navigation-and-ux-connective-tissue.md) — D-UX-1, D-UX-2, D-UX-3, D-UX-5.
4. [`../adr/0008-adhd-friendly-overwhelm-resistant-design.md`](../adr/0008-adhd-friendly-overwhelm-resistant-design.md) — D-ADHD-3 + the five-principle lens.
5. [`../../CONTEXT.md`](../../CONTEXT.md) — glossary (URL as view state, EmptyState, status severity, breadcrumb, scroll restoration).

## 2. Domain vocabulary to internalize

`URL as view state` · `context-aware return` (`from` ref) · `breadcrumb` ·
`scroll restoration` · `signal` (derived urgency) · `EmptyState` (zero / no-results /
section) · `status severity` (neutral / amber / red) · `presence dot` (not count).

## 3. Prerequisites & current-state facts (verified 2026-06-28)

- **Routed pages already do the target pattern** — `ProjectsPage`, `ClientsPage`,
  `InventoryPage`, `CatalogPage`, `EventsPage` use `/:id?` routes:
  ```ts
  const { projectId } = useParams();
  const selected = records.find((r) => r.id === projectId)
    ?? (projectId ? undefined : records[0]);
  // detail effect keys on [selected?.id]
  ```
  **Copy this exact shape** for the five pages being converted.
- **The five master-detail pages to convert** hold selection + filters in `useState`:
  `QuotesPage`, `InvoicesPage`, `ExpensesPage`, `RepairsPage`, `CertificatesPage`. Each
  has e.g. `const [selectedId, setSelectedId] = useState(null)`, `const [search,
  setSearch] = useState("")`, `const [statusFilter, setStatusFilter] = useState("")`.
- **Routes live in** `src/app/App.tsx` (`<Routes>`, `PAGE_PATH`, `pageFromPath`).
- **`breadcrumb.tsx`** exists in `src/app/components/ui/` and is **unused**.
- **`Modal.tsx`** is a centered, scale-up dialog with no mobile branch.
- **The TopBar search input** has no handler (palette is Phase 1; leave the box, F0 only
  routes/filters/primitives).

## 4. Tasks

> Each task lists **files**, the **guardrails that apply**, and **acceptance**. Build
> F0.5–0.8 first if parallelizing — they have no inter-deps and later tasks consume them.

### F0.1 — URL-routed detail for the five master-detail pages `(D-UI-8)`

Convert `QuotesPage`, `InvoicesPage`, `ExpensesPage`, `RepairsPage`, `CertificatesPage`
from `useState`-held selection to route params, matching the proven routed-page shape.

- **Files:** the five page components; `src/app/App.tsx` (add `/quotes/:quoteId?`,
  `/invoices/:invoiceId?`, `/expenses/:expenseId?`, `/repairs/:ticketId?`,
  `/certificates/:certId?` and update `PAGE_PATH`/`pageFromPath` so
  `pathname.startsWith` still resolves the base page); `master-detail.tsx` if its
  `selected`/`onSelect` props need to accept route-driven selection.
- **Pattern:** replace `selectedId` state with `const { quoteId } = useParams()`; derive
  `selected` via `find(... === quoteId) ?? (quoteId ? undefined : records[0])`; row
  click `navigate(\`/quotes/${id}\`)`; mobile back uses the breadcrumb (F0.3), not the
  old `lg:hidden` link.
- **Guardrails:** **G6** (the detail-fetch effect must key on the route param, not a
  stale `useState` copy; if a child like `QuotePricingPanel` initializes from a snapshot,
  preserve its `key={…}` remount — do not regress the "editable only once" fix). **G2**
  (don't change endpoint call conventions while refactoring — keep `apiRequest` paths
  identical).
- **Acceptance:** every record has a deep-linkable URL; reload on `/invoices/<id>` opens
  that invoice; browser Back pops per-entity; no `selectedId` `useState` remains in the
  five pages.

### F0.2 — List filters + search into URL query params `(D-UX-5)`

- **Files:** the five master-detail pages **and** the already-routed list pages that
  filter (`ProjectsPage` stageFilter, etc.). Use `useSearchParams`.
- **Pattern:** read filters from `searchParams` (`searchParams.get("status") ?? ""`);
  write via `setSearchParams`. **Debounce** the search-query write and use **replace**
  semantics for keystrokes (don't spam history); status/stage changes can push.
- **Guardrails:** **G6** (derive the filtered list from the query each render; don't
  mirror into `useState`). **G2** (when the filter maps to an API param, ensure the
  request actually scopes — see the Events "summed all invoices" bug; verify the
  returned set is filtered). Fixes the already-broken `/invoices?status=overdue`
  notification deep-link.
- **Acceptance:** `/invoices?status=overdue&client=<id>` loads pre-filtered;
  `NotificationsPanel`'s overdue link now lands filtered; Back through filter changes
  works; no filter `useState` remains.

### F0.3 — Context-aware return + breadcrumb `(D-UX-1)`

- **Files:** `breadcrumb.tsx` (wire up), the ten detail pages (render breadcrumb on both
  breakpoints; remove `lg:hidden` "← All …" links), a small `navState` helper for the
  `from` reference. Navigations from the palette (Phase 1), toasts (Phase 1), and "view
  all" (Phase 4) will set `from` via router location state.
- **Pattern:** on navigate-into-detail, pass `state={{ from: { label, href } }}`; Back
  reads `location.state?.from` → returns there with its label; fallback to the entity
  list root when absent. Cap to 2–3 segments with a leading "…" on mobile; `from` is
  single-hop.
- **Guardrails:** **G8** (breadcrumb respects 11px floor, 44px targets). **G5** (style
  via tokens/classes, not inline `var(--…)`).
- **Acceptance:** arriving at a record from elsewhere shows a reflective Back label and a
  linkable trail on desktop *and* mobile; a cold deep-link falls back to the list root.

### F0.4 — Scroll restoration utility `(D-UX-2)`

- **Files:** new `src/app/useScrollRestoration.ts` (or similar); the list pages /
  `master-detail.tsx` pass the scroll-container ref.
- **Pattern:** in-memory `Map<routeKey, scrollTop>`; save container `scrollTop` on
  navigate-away; restore on **return** (detect via the F0.3 `from`/back signal);
  scroll-to-top on new forward navigation. Container ref = desktop master-detail list
  panel / mobile main region (not `window`).
- **Guardrails:** **G6** (don't fight React with imperative scroll on every render;
  restore once on the return transition).
- **Acceptance:** scroll a long list, open a record, Back → position restored; opening a
  fresh record starts at top.

### F0.5 — `signals.ts` shared selector module `(D-UI-4)`

- **Files:** new `src/app/signals.ts`; co-located `signals.test.ts`.
- **Exports (pure functions over already-typed records):** `overdueInvoices`,
  `expiringQuotes`, `lowStock`, `overdueProjects`, `pastPromiseRepairs`, and
  `rankAttention(sources) → AttentionItem[]` (prioritized, for Phase 1's bounded top-3).
- **Guardrails:** **G7** (operate on derived `finance`/record fields, never fixture-only
  `price`/`totalSpent`; pure functions, no fetching). Manila timezone for date math
  (`Asia/Manila`).
- **Acceptance:** unit-tested pure selectors; no I/O; ready for Overview + list pages.

### F0.6 — `<EmptyState>` with three variants `(D-UX-3)`

- **Files:** new `src/app/components/ui/empty-state.tsx`.
- **Variants:** `zero` (eyebrow + encouragement + canonical primary action slot),
  `noResults` (neutral copy + **Clear filters** action, *never* a create CTA), `section`
  (quiet one-liner). Layout owned here; copy/actions passed in. **Also the closure-state
  primitive** reused in Phase 1 ("You're all caught up").
- **Guardrails:** **G5** (token classes, dashed-border treatment already in use). **G8**
  (11px floor; calm tone per the ADHD lens — no alarm color).
- **Acceptance:** one component renders all three; call sites must pass a variant.

### F0.7 — Status-severity function + dot/pill `(D-ADHD-3)`

- **Files:** new `src/app/statusSeverity.ts` (`statusSeverity(entity, status) →
  "neutral" | "amber" | "red"`); `src/app/components/ui/status-pill.tsx`
  (`<StatusDot>` / `<StatusPill>`), muted-by-default.
- **Rules:** terminal/informational states (draft, active, delivered, declined,
  cancelled, paid) → **neutral**; approaching (due soon, low stock, below-target margin)
  → **amber**; time-critical/money-at-risk (overdue, past deadline) → **red**.
  **Built here; applied across pages in Phase 5 (F5.1) — do not mass-migrate now.**
- **Guardrails:** **G5** (no saturated inline colors; tokenized). **G8** (11px). Aligns
  with CONTEXT.md "gold is never a status color."
- **Acceptance:** one severity source of truth + calm dot/pill; unit-tested mapping.

### F0.8 — Responsive `Modal.tsx` (dialog ≥md / bottom-sheet <md) `(D-UI-11)`

- **Files:** `src/app/components/Modal.tsx` only (no call-site changes).
- **Pattern:** ≥md keeps today's centered card; <md renders a full-height bottom sheet
  with internal scroll body and a **sticky footer** holding actions, honoring
  `env(safe-area-inset-bottom)` and staying above the keyboard.
- **Guardrails:** **G8** (safe-area, keyboard-safe primary, `<Modal>` is the one true
  container — this *is* that container; keep focus trap / Escape / scroll-lock). **G5**
  (backdrop `rgba(23,20,15,0.45)` + blur; no `bg-black/`).
- **Acceptance:** existing modals unchanged on desktop; on a phone the footer action
  stays visible with the keyboard open. Prereq for Phase 3's `SteppedFlow`.

## 5. Phase acceptance criteria

- [ ] Every list entity (all 10) has URL-routed detail; the five converted pages have no
      selection `useState` left (D-UI-8).
- [ ] All list filters/search are URL-encoded; `/invoices?status=overdue` lands filtered
      (D-UX-5); the notification deep-link bug is closed.
- [ ] Breadcrumb renders on both breakpoints with context-aware Back; `lg:hidden` back
      links removed (D-UX-1). Scroll restores on return (D-UX-2).
- [ ] `signals.ts`, `<EmptyState>`, `statusSeverity`+dot/pill, and responsive `Modal`
      exist, are unit-tested where logic-bearing, and are documented for consumers.
- [ ] **ADHD gate:** primitives embody the lens — `<EmptyState>` calm/closure tone,
      neutral-default severity, keyboard-safe Modal, one primary action preserved on
      every converted page.
- [ ] **Guardrails:** the Pre-PR checklist in `guardrails-common-errors.md` passes —
      especially **G1** (any endpoint touched stays on `db.select().leftJoin().map()`),
      **G6** (no stale `useState`-from-props after the state-lifting refactor; child
      `key=` remounts preserved), **G2** (filter params actually scope).
- [ ] `tsc` clean, `build:api` green, existing tests pass, **and** the five converted
      pages verified against the deployed worker (not just local) per G1/G6.

## 6. Handoff artifact

A short note for Phase 1's agent confirming: every record + filtered list is a URL;
`signals.ts` exports (with `rankAttention`) ready for the bounded "Today" surface;
`<EmptyState>` ready for closure/first-run states; responsive `Modal` ready for
`SteppedFlow`. List any endpoint files touched so the G1 sweep can be re-run.
