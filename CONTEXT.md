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

## Overwhelm-resistant design lens (ADR 0008)

The primary user gets overwhelmed easily and may have ADHD. Every screen and design
decision is checked against five governing principles. This is a design constraint
(low cognitive load, overwhelm-resistance, interruption recovery), not a medical
matter — and it takes precedence when it conflicts with density or feature richness.

1. **One obvious next thing.** Each screen makes the single most likely action
   unmistakable; everything else is quieter. Never a wall of equal choices.
2. **Never make her hold state in her head.** The app remembers where she was, what's
   unfinished, and what's next — working memory lives on screen.
3. **Calm by default; alarm is earned and rare.** Red, badges, and counts are reserved
   for the genuinely time-critical and are bounded. Calm is the resting state.
4. **Bounded, not endless.** Attention-demanding lists are capped and prioritized to a
   doable few; the app never presents an infinite backlog.
5. **Closure is designed.** The app explicitly says when she is caught up and when a
   goal is complete — permission to stop matters as much as guidance to act.

Key applications: **one attention surface** ("Today"/Needs you) capped to a top 3 with
a presence **dot, not a count**; a three-tier **status severity** (neutral default /
amber soft / rationed red — terminal states are neutral, not red); a global **resume**
strip for unfinished drafts; **default everything defaultable** (confirm, don't
originate); explicit **closure** states ("You're all caught up," "now fully paid").

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

## Workflow & navigation (ADR 0005)

- **Daily briefing** — The Overview's job: surface what needs attention *now*,
  not a project archive. Metric cards (Active Projects, Pending Quotes, Unpaid
  Invoices, Overdue) + a prioritized **Needs Attention** list + calendar +
  pipeline. Vanity metrics and page-duplicating tables are excluded.
- **Needs Attention** — The Overview's single prioritized action list: overdue
  projects, expiring quotes, past-due invoices, past-promise repairs, low stock.
  Each row links to the record. Built from **signals**.
- **Signal** — A derived urgency/status fact computed by a pure function in
  `src/app/signals.ts` (e.g. `overdueInvoices`, `expiringQuotes`, `lowStock`).
  One definition per calculation, reused by the Overview and the list pages.
  Honors "calculated truth" — never stored.
- **Command palette** — The global search (⌘K / tap), backed by `command.tsx` and
  `/api/search`. Searches clients, projects, quotes, invoices, pieces, repairs by
  name/number/SKU and navigates to the record. The one keystroke from anywhere to
  any record; replaces the formerly inert TopBar search box.
- **Primary destinations** — Overview, Projects, Catalog, Clients: the daily four,
  ungrouped at the top of both the desktop sidebar and the mobile bottom nav.
  Everything else is grouped **Sales** (Quotes, Invoices, Events) · **Operations**
  (Inventory, Expenses, Repairs) · **Records** (Accounting, Certificates, Reply
  Templates). Both surfaces teach the same structure.
- **Record sale** — The single atomic action for selling a finished piece: creates
  invoice + stock-out movement + payment together. Event is optional (`eventId` at
  an event, absent for a walk-in). Requires on-hand stock; made-to-order goes
  through the project path. Reached from the catalog piece detail ("Sell this
  piece"), the finished-piece batch in Inventory, or an event. One of three money
  entry points: **Bill from project** (commission), **Record sale** (finished
  piece), **Create invoice** (bare bill, never touches stock).
- **Connected history** — The contract that each record's detail surfaces its full
  linked history, derived from source records. Client: lifetime value (Σ payments),
  open balance (Σ invoice balances), projects, quotes, invoices, certificates,
  repairs, activity. Project: originating quote, invoices, payments, certificate,
  finance, activity. The **piece 360** is the reference standard. Linked sections
  show count + recent few + "view all"; lifetime value is never a stored field.
- **Actionable toast** — A success toast that offers the next workflow step
  (`Invoice INV-0012 created · View →`) instead of stranding the user. Threads the
  quote → project → invoice → payment relay without forcing navigation.

## Stepped flows (ADR 0006)

- **Stepped flow** — A form broken into ordered phases shown one-at-a-time on mobile
  and as a stepper rail on desktop. Reserved for tasks that have *both* natural
  sequential phases *and* line-items/cross-entity scope. Exactly three: **Record
  sale** (2 steps), **Quote** (4), **Repair intake** (4). All other forms are
  single-pane. A flow is stepped only for **create/resume**; **edit** renders the
  same step components as one stacked single-pane scroll.
- **`SteppedFlow`** — The shared navigation+layout primitive (peer of `MasterDetail`,
  `ResponsiveTable`). Owns step order, current index, responsive rail/sheet chrome,
  the keyboard-safe footer, advance-gating, and the pinned-summary slot. Owns no
  domain type — each flow supplies its own state, fields, validation, and submit.
- **Advance-gating** — The rule that "Continue" is blocked only by missing/invalid
  **hard-required** fields (inline error on tap); soft warnings (e.g. the
  target-margin guardrail) never gate; Back and jump-to-completed are always free;
  Submit re-validates everything. A step's `isValid` means "hard-required satisfied."
- **Resume draft** — Reopening a stepped flow restores its autosaved values *and* the
  step the user left on. Drafts autosave to the `useDraft` IndexedDB at step
  boundaries (not per keystroke), persist `currentStep`, and clear on successful
  submit. A Record-sale draft is labeled "{piece} · not yet sold" so it is never
  mistaken for a completed sale.
- **Pinned summary** — The always-visible running total inside a stepped flow: a
  tappable strip above the footer on mobile, a persistent panel beside the rail on
  desktop. Keeps the basis of a calculated amount visible at every step; the final
  **Review** step is the full itemized audit before Submit.
- **Additional details** — The universal disclosure for uncommon, optional fields,
  collapsed within a form (single-pane) or within a step (stepped). Never a step of
  its own; never hides a required field. Orthogonal to stepping.

## Navigation & UX connective tissue (ADR 0007)

- **Context-aware return** — Back follows where you actually came from, not a fixed
  list root. Navigations into a detail carry a `from` reference (set by the command
  palette, actionable toasts, and "view all" links); Back returns there with a
  reflective label ("← Maria's invoices") and falls back to the list root only when
  `from` is absent. Surfaced as a **breadcrumb** on both breakpoints.
- **Breadcrumb** — The path trail (`Clients › Maria Santos › INV-0012`), each segment
  a real link, rendered on both desktop and mobile (capped to 2–3 segments with a
  leading "…" on mobile). Replaces the old `lg:hidden` "← All clients" back link and
  gives desktop master-detail the back affordance it previously lacked.
- **Scroll restoration** — Returning to a list restores the scroll position you left,
  targeting the scroll *container* (the master-detail list panel on desktop, the main
  region on mobile). Session-only and route-keyed; forward navigation to a new page
  scrolls to top. Together with URL-routed detail and URL filters, return restores the
  whole view: **filter + scroll + position**.
- **URL as view state** — The principle that "where am I" lives in the URL, never in
  component state. Detail selection (D-UI-8), list **filters and search** (D-UX-5), and
  360 **section anchors** (`#financials`) are all URL-encoded, making every view
  linkable, bookmarkable, and back-button-correct. List filters use `useSearchParams`;
  search writes are debounced with history *replace*, not push.
- **EmptyState** — The shared empty-view component with three explicit variants:
  *zero-state* (no records — encouragement + the canonical primary action),
  *no-results* (search/filter matched nothing — neutral copy + **Clear filters**, never
  a create CTA), and *section-empty* (an empty 360 section — quiet one-liner). Each
  call site must declare which empty it is; the component owns layout, copy is
  page-supplied.
- **Launchpad** — The persistent quick-action block atop the Overview surfacing the
  three plain-language actions: **Create quote · Add client · Record payment** (payment
  opens an invoice picker first). Every visit has a one-tap path to the common task.
- **First-run checklist** — When the studio has no clients/projects/quotes, the
  Overview replaces the zeroed daily briefing with a welcome checklist. **Derived** —
  each item checks off when that record type first exists — never a stored flag; recedes
  once real data lands. (The full onboarding/settings wizard is deferred.)
- **Section nav (scroll-spy)** — The slim sticky sub-nav on the three rich 360s
  (Client, Project, Piece) that jump-scrolls to connected-history sections and
  highlights the active one. **Anchor-scroll, not tabs** — keeps the connected history
  visible at a glance and preserves find/print. Applied only at ≥4 sections; light
  details stay plain scroll.

## Overwhelm-resistant patterns (ADR 0008)

- **Today / Needs you** — The single attention surface (the renamed, bounded Needs
  Attention). Capped to a prioritized **top 3** (ranked by the signals module) + "show
  the rest." Items read as gentle next-actions, not alarms. The one place "what needs
  me" lives — the notifications bell is demoted to a pointer, removed on desktop.
- **Presence dot** — The calm replacement for the notification count badge: a single
  dot meaning "there's something for you" (or nothing when clear). Conveys *that* there
  is something without the anxiety of *how many things are wrong*. Never a number.
- **Status severity** — The three-tier, app-wide status model: **neutral** (default;
  informational + terminal states like cancelled/declined — muted ink + quiet dot, no
  saturated color), **amber** (soft/approaching), **red** (rationed; only genuinely
  time-critical, only on the rows that have it). One shared severity function; color
  marks the exception row, not every row.
- **Resume strip** — The global "Pick up where you left off" on the Overview, listing
  unfinished drafts across all entities (one-tap resume to the saved step, frictionless
  discard). Derived, bounded, self-clearing on submit/discard, auto-expiring when stale.
  Makes interrupted work visible so a dropped thread is never lost (out of sight = out
  of mind).
- **Confirm, don't originate** — The defaulting discipline: every field that can have a
  sensible default gets one, shown with visible provenance and overridable, so a form is
  mostly pre-answered. One decision in focus at a time. **Consequential fields** (payment
  amount, which piece sold) are never silently defaulted — default the ceremony, surface
  the substance.
- **Closure state** — A designed "you're done" signal: "You're all caught up" when the
  attention surface is clear, goal-completion confirmations ("now fully paid"), finite
  lists with reachable bottoms, and a daily "Nothing else needs you today." Permission to
  stop, which makes the calm sustainable.
