# 0006 — Multi-step mobile flows

- Status: Accepted
- Date: 2026-06-28
- Deciders: Owner, Developer (grilling session)
- Follows: [ADR 0005](0005-ui-workflow-and-organization.md) D-UI-11, which settled the
  responsive form container but deferred whether long forms get a stepped flow.

## Context

`project.md` prescribes the pattern once: "On mobile, use short step flows such as
`Client → Items → Payment → Review`, autosave local drafts, keep the primary action
above the keyboard, and put uncommon fields behind an `Additional details`
disclosure. A live summary should remain available without forcing the user to leave
the form." ADR 0005 (D-UI-11) built the responsive dialog/bottom-sheet container but
explicitly left stepping as a separate decision.

The codebase already has the raw materials: `record-sale-modal.tsx` steps
`select → review`; `useDraft.ts` is an IndexedDB-backed draft hook (manual-save,
whole-form, multi-draft per entity) already used by Clients, Catalog, Projects,
Inventory. Heaviest create forms by raw field count: Expenses, Invoices, Repairs,
Quote/pricing, Projects.

This ADR decides *which* flows step, *how* the stepping primitive is scoped, and the
gating/draft/summary/disclosure/edit behaviors around it.

## Decisions

### Scope — which flows step

- **D-MS-1 — Step a flow only when it meets both tests: (a) the real-world task has
  natural sequential phases, and (b) it has line-items or crosses entity boundaries.**
  Result: **three stepped flows — Record sale, Quote, Repair intake.** Everything else
  (Expense, standalone Invoice, Project, Client, Catalog, Inventory, Event) stays
  single-pane with an "Additional details" disclosure, riding the D-UI-11 responsive
  sheet. Expenses, despite the highest raw field count, stays single-pane because
  logging an expense is a frequent, fast action that wizard steps would slow.

### The primitive and its seam

- **D-MS-2 — One shared `<SteppedFlow>` primitive, rendered responsively.** Vertical
  stepper rail + wide panel on desktop; full-screen one-step-at-a-time sheet on mobile
  (delegating to the D-UI-11 container). The step *model* (ordered phases, per-step
  validity, data) is shared across breakpoints; only the *chrome* differs. Avoids
  maintaining two divergent layouts per flow. Ship stepped-on-both; loosen desktop to
  an expanded-accordion only if quote entry feels over-chunked.
- **D-MS-3 — `<SteppedFlow>` is a navigation+layout shell, deep on one job and
  ignorant of step contents** (mirrors ADR 0004's MasterDetail seam). The primitive
  owns: ordered step list (label + content slot), current index, responsive
  rail/sheet chrome, the sticky keyboard-safe footer (Back / Continue / Submit),
  advance-gating via a per-step `isValid` the flow supplies, and reduced-motion
  transitions. Each flow owns: its form state + `onChange`, the field components per
  step, validation logic, and the submit handler (which fires the D-UI-6 actionable
  toast). The stepper never imports a domain type.
  API ≈ `<SteppedFlow steps={[{label, content, isValid}]} onSubmit={...} />`.

### Behavior

- **D-MS-4 — Advance-gating: forward gated on hard-required fields only.** Continue is
  blocked only when the current step has missing/invalid required fields, with the
  error shown inline on tap (no pre-emptive nagging of untouched fields). Soft
  warnings (e.g. the target-margin guardrail, D31) never gate — they show an amber
  notice and let the user proceed. Back and jump-to-completed-step are always free.
  Submit re-validates all steps and jumps to the first offender. `isValid` means
  "hard-required satisfied," so soft warnings stay invisible to the gating logic.
- **D-MS-5 — Autosave at step boundaries, resume-to-step, clear-on-submit.** The whole
  flow state autosaves to the existing `useDraft` IndexedDB on each Continue/Back
  transition and on dismiss (debounced, not per-keystroke), persisting `currentStep`
  alongside the values. Reopening offers "Resume draft" (reusing the ClientsPage
  drafts-list pattern) and restores both data and step. `useDraft.discard` clears the
  draft on successful submit, when the D-UI-6 toast fires. Scoped to the three stepped
  flows; non-stepped forms keep today's manual drafts. Record sale's resume entry is
  labeled "{piece} · not yet sold" so a lingering draft is never mistaken for a
  completed sale.
- **D-MS-6 — A persistent live summary.** Mobile: a slim, tappable summary strip
  pinned between the step content and the footer, always showing the one number that
  matters (sale total, quote selling price + margin %, repair charge); tapping expands
  the full itemized breakdown. Desktop: a persistent summary panel beside the rail.
  The final Review step is the complete itemized audit before Submit. `<SteppedFlow>`
  provides the pinned slot; the flow computes/renders the content (D-MS-3 seam).
  Honors "never hide the basis of a calculated amount" at every step, not just Review.
- **D-MS-7 — Uncommon fields collapse behind an "Additional details" disclosure within
  their step — never a step of their own, never hiding a required field.** Step count
  (the perceived-length driver) stays minimal. "Additional details" is one universal
  gesture, used the same way in stepped flows (per-step) and single-pane forms (one
  in-form disclosure), so it is orthogonal to stepping.

### Step sequences and entry

- **D-MS-8 — Canonical step sequences (2 / 4 / 4):**
  - **Record sale:** 1) Pieces (pick + quantities, stock-checked) · 2) Review & pay
    (client + payment method + confirm). Stays short — a counter transaction with a
    customer waiting.
  - **Quote:** 1) Piece & client · 2) Cost lines (drawn from live inventory cost) ·
    3) Pricing (markup + discount + target-margin warning) · 4) Review. Four because
    pricing has genuinely distinct phases and the margin number must not be buried.
  - **Repair intake:** 1) Client · 2) Item & condition (+ photos, + "Additional
    details" disclosure for marks/accessories) · 3) Work & charge · 4) Review.
  - **Dual entry generalizes:** launched from a related record (e.g. Repair from a
    client's detail), the matching step is pre-filled and the flow opens past it;
    launched cold, that step is the picker. Same step model, different doorway —
    connects to D-UI-10's "doorways."
- **D-MS-9 — Stepped for create/resume; single-pane for edit.** Creating or resuming a
  draft uses the gated `<SteppedFlow>`. Editing a pre-lock record renders the *same
  step components* as stacked, all-visible sections in one scroll — no gating, jump
  straight to the field. Each step component is written once and hosted in two
  containers (wizard vs stacked); only the container differs, mirroring the
  create-vs-edit chrome split already accepted elsewhere. Validation is shared but not
  used for gating in edit mode. Locked records (accepted quote, issued invoice, issued
  certificate) get no edit form — they stay read-only with their post-lock actions.

## Consequences

- New shared primitive `<SteppedFlow>` joins `MasterDetail` and `ResponsiveTable` as a
  layout shell. `record-sale-modal.tsx` is refactored to be its first consumer.
- `useDraft` gains `currentStep` persistence; otherwise reused as-is.
- Three flows (Record sale, Quote, Repair intake) get wizard create + single-pane edit
  containers sharing one set of step components each.
- The pinned-summary slot and per-step `isValid` are the only additions to the
  D-UI-11 container contract.
- No backend changes — stepping is a client-side composition concern.

## Alternatives considered

- **Step every long form (incl. Expenses)** — rejected: stepping a frequent, fast
  action taxes the common path; field count is not the right trigger, phase structure
  is.
- **Different layouts per breakpoint (true single-pane desktop, wizard mobile)** —
  rejected: doubles maintenance for three flows and guarantees drift. One responsive
  primitive instead.
- **A batteries-included stepper that owns form state** — rejected: a sale, a quote,
  and a repair share no fields; an opinionated form-owning stepper would fight all
  three. Pure nav shell instead (D-MS-3).
- **Gate every step fully, or validate only at submit** — rejected in favor of
  forward-gated-on-required with free backward (D-MS-4); the extremes are either naggy
  or let users reach Review on a broken foundation.
- **Per-keystroke autosave / fully manual drafts** — rejected: step-boundary autosave
  reuses the existing IndexedDB layer without keystroke thrash and without losing work
  to a dismiss (D-MS-5).
- **One container for create and edit** — rejected: wizard-edit forces a multi-step
  walk to fix one field; single-pane-create loses mobile chunking. Split containers,
  shared components (D-MS-9).
