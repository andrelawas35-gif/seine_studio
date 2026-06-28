# Build Plan — UX, Workflow & ADHD-Resilient Operations

**Status:** Planning complete (2026-06-28). Sequences [ADR 0005](../adr/0005-ui-workflow-and-organization.md),
[ADR 0006](../adr/0006-multi-step-mobile-flows.md), [ADR 0007](../adr/0007-navigation-and-ux-connective-tissue.md),
and [ADR 0008](../adr/0008-adhd-friendly-overwhelm-resistant-design.md) into a
dependency-ordered build.

**Relationship to the existing plan:** [`multi-agent-build-plan.md`](./multi-agent-build-plan.md)
delivered Waves 0–2 (schema, UI foundation, Catalog) and scoped Waves 3–6 (quote
spine, events/sales, 360 views, polish). This plan **refines and supersedes the
specs** for the pending waves with the richer decisions from ADRs 0005–0008 — e.g.
the "360 views" wave now follows D-UI-13 + D-UX-6, and "events/sales" now follows the
unified Record-sale model (D-UI-9/10). Where a phase below overlaps a pending wave,
this plan's spec wins.

**Two mandatory gates on every phase:** every task must pass **both** the ADHD
compliance gate (below) **and** the [`guardrails-common-errors.md`](./guardrails-common-errors.md)
pre-PR checklist — the catalog of failures that already shipped to production
(Drizzle/Workers `leftJoin` bug, endpoint scoping, Zod/PATCH, CSS-variable transparency,
stale `useState`-from-props, fixtures-vs-API, iOS/PWA). Most compile clean and only fail
in the deployed worker or on a real device, so "works locally" does not clear them.

**Agent-ready context packs:** each phase gets a self-contained pack an agent can build
from without full project history. Phase 0:
[`phase-0-context-pack.md`](./phase-0-context-pack.md) (ready). Later packs are written
just-in-time from each phase's handoff artifact.

---

## The ADHD compliance gate (applies to EVERY phase)

ADR 0008 is a cross-cutting constraint, not a phase. **No task in any phase is "done"
until it passes this gate.** Reviewers check every PR against it.

- [ ] **One obvious next thing.** The screen has exactly one filled primary action;
      everything else is visually subordinate (outline/ghost). No wall of equal buttons.
- [ ] **No held state.** Anything the user would otherwise have to remember (where they
      were, what's unfinished, a default value, a running total) is on screen.
- [ ] **Calm by default.** No saturated color except via the shared severity function
      (D-ADHD-3); terminal states (cancelled/declined/paid) are neutral, not red. No
      count badges — presence dots only.
- [ ] **Bounded.** Any attention/backlog list is capped to a prioritized few with
      "show the rest" collapsed; working lists are finite/paginated (have a bottom).
- [ ] **Closure.** Empty = a warm "caught up" state (never a blank); a completed goal
      states the goal ("now fully paid"), not just the action.
- [ ] **Confirm, don't originate.** Every defaultable field is pre-filled with visible,
      labeled, overridable provenance; consequential fields (amount, which piece) are
      never silently defaulted.
- [ ] **Reduced-motion + touch.** Respects `prefers-reduced-motion`; 44×44px targets;
      primary action reachable above the mobile keyboard.

---

## Phase map

```
Phase 0: Foundation — URL-as-state + signals + shared primitives ───────────┐
                                                                            │
Phase 1: Attention, Overview & cold-start (the ADHD core) ◄── signals ──────┤
                                                                            │
Phase 2: Money model & workflow continuity ◄── URL routing ─────────────────┤
                                                                            │
Phase 3: Stepped flows ◄── responsive Modal ────────────────────────────────┤
                                                                            │
Phase 4: Connected history & 360 navigation ◄── URL routing + severity ─────┤
                                                                            │
Phase 5: Cross-cutting calm sweeps ◄── all primitives ──────────────────────┘
```

Phase 0 unblocks everything. Phase 1 is sequenced early on purpose — it is the
highest user value (the calm shell the owner lives in) and depends only on Phase 0.

---

## Phase 0 — Foundation: URL-as-state, signals, primitives

**Covers:** D-UI-8, D-UX-5, D-UX-1, D-UX-2, D-UI-4, D-UX-3, D-ADHD-3, D-UI-11.
**Depends on:** nothing (load-bearing layer). **This is the critical path.**

The through-line: *"where am I and what state is the data in" lives in the URL or a
derived pure function — never trapped in component state.*

### Tasks

- **F0.1 — URL-routed detail for the five master-detail pages.** `(D-UI-8)`
  Give Quotes, Invoices, Expenses, Repairs, Certificates the `/:id?` route the other
  five already use. `master-detail.tsx` reads the selected ID from `useParams`, not
  `useState`. Proven pattern — Projects/Clients/Inventory already do this.
- **F0.2 — List filters + search into URL query params.** `(D-UX-5)`
  Refactor each list page's `statusFilter` / `search` / `clientId` / `stageFilter`
  from `useState` to `useSearchParams`. Debounce search writes; `replace` not `push`
  for keystrokes. Fixes the already-broken `/invoices?status=overdue` notification link.
- **F0.3 — Context-aware return + breadcrumb.** `(D-UX-1)`
  Navigations into a detail carry a `from` reference; Back returns there with a
  reflective label, list-root as fallback. Wire the unused `breadcrumb.tsx` on both
  breakpoints; retire the `lg:hidden` back links. Cap 2–3 segments on mobile.
- **F0.4 — Scroll restoration utility.** `(D-UX-2)`
  Route-keyed, in-memory `Map<routeKey, scrollTop>`. Takes a container ref (desktop =
  master-detail list panel; mobile = main region). Restore on return, top on new nav.
- **F0.5 — `signals.ts` shared selector module.** `(D-UI-4)`
  Pure functions: `overdueInvoices`, `expiringQuotes`, `lowStock`, `overdueProjects`,
  `pastPromiseRepairs`, plus a `rankAttention()` that orders them for the bounded
  top-3 (Phase 1). Single source of every "urgency" calculation; no stored flags.
- **F0.6 — `<EmptyState>` with three variants.** `(D-UX-3)`
  `zero` (encouragement + canonical primary action), `noResults` (neutral + Clear
  filters, never a create CTA), `section` (quiet one-liner). Layout owned; copy
  page-supplied. **This is also the closure-state primitive** used in Phase 1.
- **F0.7 — Status-severity function.** `(D-ADHD-3)`
  One app-wide `statusSeverity(entity, status) → "neutral" | "amber" | "red"` + a
  `<StatusDot>`/`<StatusPill>` that renders muted-by-default. Terminal states map to
  neutral. (Built here; **applied across pages in Phase 5**.)
- **F0.8 — Responsive `Modal.tsx` (dialog ≥md / bottom-sheet <md).** `(D-UI-11)`
  Sticky, safe-area-aware footer holding actions above the keyboard. No call-site
  changes. Prerequisite for the SteppedFlow container (Phase 3).

### ADHD gate focus for this phase
Primitives must *embody* the constraint so later phases inherit it for free:
`<EmptyState>` ships the calm "caught up" tone; `statusSeverity` makes neutral the
default; the responsive Modal keeps the primary action above the keyboard.

### Handoff artifact
Every record and every filtered list is a URL; `signals.ts`, `<EmptyState>`,
`statusSeverity`, and the responsive Modal are ready for consumption.

---

## Phase 1 — Attention, Overview & cold-start (the ADHD core)

**Covers:** D-ADHD-2, D-UX-4, D-ADHD-4, D-ADHD-6, D-UI-7, D-UI-3 (final form), D-UI-6 (toast infra).
**Depends on:** F0.5 (signals), F0.6 (EmptyState), F0.1–0.2 (URL state for palette/links).

This is the calm shell the owner lives in. Built early because it is the highest-value
expression of ADR 0008.

### Tasks

- **F1.1 — "Today" bounded attention surface.** `(D-ADHD-2, D-UI-3)`
  Rebuild the Overview's Needs Attention as the single attention home, renamed
  "Today"/"Needs you". `rankAttention()` → **top 3** + "show the rest" collapsed.
  Items are gentle next-actions (action-framed copy), not red tags.
- **F1.2 — Notification badge → presence dot; demote the bell.** `(D-ADHD-2)`
  Replace the `9+` count with a single presence dot. Desktop: remove the bell
  (Overview is one click). Mobile: bell becomes a quiet pointer to "Today", no
  divergent list.
- **F1.3 — Quick-action launchpad.** `(D-UX-4)`
  Persistent top-of-Overview block: **Create quote · Add client · Record payment**
  (payment opens an invoice picker first). Deep-links into the create flows.
- **F1.4 — Derived first-run checklist.** `(D-UX-4)`
  Zero-data state replaces the zeroed briefing with a welcome checklist (reuse
  `<EmptyState zero>`). Derived from "does any record of type X exist"; recedes once
  data lands. No stored flag.
- **F1.5 — Resume strip ("Pick up where you left off").** `(D-ADHD-4)`
  Lists unfinished `useDraft` drafts across all entities; one-tap resume to saved
  `currentStep`; frictionless inline discard; bounded + "show all". Add **auto-expiry**
  of drafts untouched N days. (`useDraft` gains `currentStep` persistence — see F3.1.)
- **F1.6 — Closure states.** `(D-ADHD-6)`
  "You're all caught up" when Today is clear; "Nothing else needs you today" when the
  day's items clear. Goal-completion phrasing wired into the toast system (F1.7).
- **F1.7 — Actionable toast system.** `(D-UI-6)`
  Toast with a next-step action (`Invoice INV-0012 created · View →`) and
  goal-completion phrasing ("now fully paid"). Consumed by Phases 2–3. Links rely on
  Phase 0 URL routing.
- **F1.8 — Global command palette.** `(D-UI-7)`
  ⌘K / mobile tap-fullscreen, backed by `command.tsx` + a new `/api/search?q=`
  (`ILIKE` across clients, projects, quotes, invoices, pieces, repairs). Results
  grouped by type, navigate to the record (sets `from` for D-UX-1).

### ADHD gate focus
This phase **is** the gate made visible: the bounded top-3, the dot-not-count, the
resume strip, and the caught-up states are the literal deliverables. Reviewer verifies
no surface here can grow unbounded and nothing shouts.

### Handoff artifact
The owner lands on a calm, bounded, finite Overview that shows what needs her, what
she left open, and when she's done — and can jump to any record in one keystroke.

---

## Phase 2 — Money model & workflow continuity

**Covers:** D-UI-9, D-UI-10, D-UI-6 (consumption), D-ADHD-5 (forms touched here).
**Depends on:** Phase 0 (URL routing), F1.7 (toast system).

Closes the silent stock-leak and makes the money chain a forward relay.

### Tasks

- **F2.1 — Unify Record sale.** `(D-UI-9, D-UI-10)`
  Promote `record-sale-modal` to a first-class flow with an **optional** event.
  Atomic invoice + stock-out + payment. Homes: "Sell this piece" on the catalog piece
  detail (primary), the finished-piece batch in Inventory (secondary), Events
  (existing, `eventId` pre-filled). Requires on-hand stock.
- **F2.2 — Reframe standalone "Create invoice"** as a bare demand-for-payment that
  never touches stock; relabel so it isn't reached for selling a piece. `(D-UI-9)`
- **F2.3 — Thread the relay with actionable toasts.** `(D-UI-6)`
  Bill deposit/balance → `Invoice … created · View →`; record payment → goal-completion
  ("now fully paid"). No more dead-end toasts.
- **F2.4 — Defaults & provenance on money forms.** `(D-ADHD-5)`
  Dates = today; deposit % = studio default; payment method = last used; amounts
  inherit with "From accepted quote" labels. Amount and piece are confirmed, never
  silent.

### ADHD gate focus
"Confirm, don't originate" is concentrated here — the money forms become glance-and-confirm.
Closure: every payment states the resulting balance/goal.

### Handoff artifact
One coherent answer to "how do I record that someone bought something," no stock leak,
forward-threaded toasts.

---

## Phase 3 — Stepped flows

**Covers:** D-MS-1…D-MS-9, D-ADHD-5 (defaults within steps), D-MS-7 (disclosure).
**Depends on:** F0.8 (responsive Modal), F1.7 (toast), F2.1 (Record sale is first consumer).

### Tasks

- **F3.1 — `<SteppedFlow>` primitive.** `(D-MS-2, D-MS-3, D-MS-4, D-MS-6)`
  Nav/layout shell: ordered steps, responsive rail (≥md) / sheet (<md), keyboard-safe
  footer, advance-gating via per-step `isValid` (hard-required only; soft warnings never
  gate), pinned-summary slot. Owns no domain type. `useDraft` gains `currentStep`
  persistence (autosave at step boundaries; clear on submit — D-MS-5).
- **F3.2 — Record sale → SteppedFlow.** `(D-MS-8)` 2 steps (Pieces · Review & pay).
  Refactor of the existing `select → review` — proves the primitive.
- **F3.3 — Quote → SteppedFlow.** `(D-MS-8)` 4 steps (Piece & client · Cost lines ·
  Pricing · Review). Pinned summary = selling price + margin %; target-margin warning
  is a soft (non-gating) amber notice.
- **F3.4 — Repair intake → SteppedFlow.** `(D-MS-8)` 4 steps (Client · Item & condition
  · Work & charge · Review). Dual-entry: pre-fill client when launched from a client.
- **F3.5 — Create vs edit containers.** `(D-MS-9)`
  Stepped for create/resume; single-pane (same step components, stacked) for editing
  pre-lock records; locked records stay read-only.
- **F3.6 — "Additional details" disclosure within steps.** `(D-MS-7)` Uncommon fields
  collapse within their step; never their own step; never hide a required field.

### ADHD gate focus
Chunking (one step at a time) + pinned summary (no held running total) + resume
(no lost thread) are the ADHD payoff of this phase. Verify step counts stay 2/4/4 —
step count is the perceived-length driver.

### Handoff artifact
Three interruption-safe, summary-always-visible flows on one shared primitive.

---

## Phase 4 — Connected history & 360 navigation

**Covers:** D-UI-13, D-UX-6.
**Depends on:** Phase 0 (URL routing for "view all", severity for status), F0.6 (EmptyState `section`).

### Tasks

- **F4.1 — Connected-history contract.** `(D-UI-13)`
  Client 360: lifetime value (Σ payments), open balance (Σ invoice balances), projects,
  quotes, invoices, certificates, repairs, activity — all derived. Project 360:
  originating quote, invoices, payments, certificate, finance, activity. Extend the
  detail endpoints to embed compact linked-record summaries.
- **F4.2 — "View all" deep links.** Each section's "view all" links to the now-routable,
  now-filterable list (`/invoices?client=<id>` — relies on F0.1 + F0.2).
- **F4.3 — Scroll-spy section nav on the three rich 360s.** `(D-UX-6)`
  Sticky sub-nav under the breadcrumb; anchor-scroll (not tabs); deep-linkable
  `#section`. Trigger ≥4 sections; light details stay plain scroll.
- **F4.4 — Empty 360 sections use `<EmptyState section>`.** Quiet one-liners, no page CTA.

### ADHD gate focus
The 360s get long — scroll-spy keeps them navigable without held state; section-empty
states stay quiet (calm), never alarming.

### Handoff artifact
Client and Project reach the piece-360 standard; every section is derived, navigable,
and linkable.

---

## Phase 5 — Cross-cutting calm sweeps

**Covers:** D-ADHD-3 (application), D-UI-12, D-UI-2, D-UI-5, D-ADHD-5 (remaining forms).
**Depends on:** F0.7 (severity function), and all pages in their near-final form.

Pure consistency passes — cheap individually, high cumulative calm.

### Tasks

- **F5.1 — Status-color desaturation sweep.** `(D-ADHD-3)`
  Replace every ad-hoc `STATUS_*` color map and the 43 `text-red`/28 `bg-red` usages
  with `statusSeverity` + `<StatusDot>`/`<StatusPill>`. Audit: terminal states neutral,
  color only on exception rows.
- **F5.2 — Primary-action label standardization.** `(D-UI-12)`
  One filled `verb + noun` primary per page (Create project, Add client, Log expense,
  Receive batch, Issue certificate…). Retire every bare "New". Same string in header /
  mobile action / empty-state CTA.
- **F5.3 — Navigation grouping.** `(D-UI-2, D-UI-5)`
  Mobile "More" drawer and desktop sidebar both grouped: primary four ungrouped, then
  **Sales / Operations / Records** with eyebrow headers.
- **F5.4 — Remaining defaults/provenance audit.** `(D-ADHD-5)`
  Sweep any create flow not touched in Phases 2–3 for defaultable fields + required-field
  reduction.

### ADHD gate focus
This phase's *entire purpose* is the gate: it removes the residual loud color, the
ambiguous "New" buttons, and the flat nav that pull against calm.

### Handoff artifact
The whole app reads as one calm, consistent surface; status means the same thing
everywhere; one verb per action; grouped nav on both surfaces.

---

## Sequencing summary & rationale

| Phase | Why here |
|---|---|
| **0 Foundation** | URL-as-state + signals + primitives unblock literally everything; nothing real ships without them. |
| **1 ADHD Overview core** | Highest user value, depends only on Phase 0. Gives the owner the calm shell first. |
| **2 Money model** | Fixes a correctness bug (silent stock leak) and needs only URL routing + the toast system from P1. |
| **3 Stepped flows** | Needs the responsive Modal (P0) and Record sale (P2) as first consumer. |
| **4 Connected history** | Needs URL routing + severity; makes the 360s deep and navigable. |
| **5 Calm sweeps** | Done last because they touch pages in their near-final form; pure consistency. |

**The ADHD constraint is not Phase-shaped — it is the gate on all six phases.** Phase 0
bakes it into the primitives, Phase 1 makes it the visible product, and every later
phase inherits it through the gate checklist. If a task can't pass the gate, it isn't
done.
