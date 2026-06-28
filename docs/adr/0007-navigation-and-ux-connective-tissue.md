# 0007 — Navigation & UX connective tissue

- Status: Accepted
- Date: 2026-06-28
- Deciders: Owner, Developer (grilling session)
- Builds on: [ADR 0005](0005-ui-workflow-and-organization.md) (URL-routed detail,
  command palette, connected history) and [ADR 0006](0006-multi-step-mobile-flows.md).

## Context

ADRs 0005–0006 settled the information architecture, the command palette, connected
history, and stepped flows. They left the *connective tissue* between pages
unaddressed — and in two cases actively worsened it:

- Back-navigation is hardcoded to a fixed root (`navigate("/clients")`, "← All
  clients", `lg:hidden` so desktop has none). The command palette and "view all"
  deep links (0005) now land users on records from anywhere, so "back to the list
  root" returns them somewhere they never were.
- List filters live in component `useState`, not the URL — so connected-history
  "view all" links can't carry a filter, and the existing
  `/invoices?status=overdue` notification link already lands on the *unfiltered*
  list.
- No scroll restoration; `breadcrumb.tsx` is unused; empty states are hand-rolled
  and conflate "you have nothing" with "your search matched nothing"; there is no
  first-run experience or quick-action launchpad despite `project.md` prescribing
  both.

The through-line of this ADR: **the things that define "where am I and how do I get
back" belong in the URL or a derived signal, never trapped in component state** —
the same principle D-UI-8 applied to detail selection, now extended to return paths,
list filters, and section anchors.

## Decisions

- **D-UX-1 — Context-aware return + breadcrumbs.** Navigations into a detail carry a
  `from` reference (set by the command palette, actionable toasts, and "view all"
  links). Back returns *there* with a reflective label ("← Maria's invoices"),
  falling back to the list root only when `from` is absent (fresh deep link /
  reload). Surface the trail with the (currently unused) `breadcrumb.tsx` on **both**
  breakpoints, retiring the `lg:hidden` mobile-only back — which also gives desktop
  master-detail the back affordance it lacks today. Cap to 2–3 segments with a
  leading "…" on mobile; `from` is a single-hop return, not a full navigation stack.
  Browser/hardware Back keeps normal per-entity history (works thanks to D-UI-8).
- **D-UX-2 — In-memory, route-keyed scroll restoration.** Cache the scroll
  *container's* `scrollTop` on navigate-away; restore on return (detected via the
  D-UX-1 back signal); scroll-to-top on genuinely new forward navigation. A utility
  takes a ref so desktop targets the master-detail list panel and mobile targets the
  main region (browser-native `history.scrollRestoration` can't do either). Session
  -only `Map<routeKey, scrollTop>`; reload legitimately starts fresh.
- **D-UX-3 — Shared `<EmptyState>` with three explicit variants.**
  *Zero-state* (no records exist): eyebrow + encouragement + the page's canonical
  primary action (D-UI-12 verb+noun). *No-results* (search/filter matched nothing):
  neutral copy + **Clear filters**, never a create CTA. *Section-empty* (a
  connected-history section is empty): quiet one-liner, optional contextual action,
  no page CTA. The component owns layout/tone; copy stays page-supplied. Each call
  site must declare *which* empty it is — fixing the current conflation where pages
  offer "create" when a search returns nothing.
- **D-UX-4 — Quick-action launchpad + derived first-run checklist; full settings
  wizard deferred.** A persistent launchpad at the top of the Overview surfaces the
  three plain-language actions from `project.md` — **Create quote**, **Add client**,
  **Record payment** (payment opens an invoice picker first, since payment requires
  an invoice). When the studio has zero clients/projects/quotes, the Overview
  replaces the zeroed daily briefing with a welcome checklist (reusing the
  `<EmptyState>` zero-variant at page level); the checklist is **derived** (each item
  checks off when that record type first exists), never a stored flag, and recedes
  once real data lands. The full guided onboarding/settings wizard (business
  identity, currency, labor-rate cards, import) is **deferred** — it needs a Settings
  surface that does not yet exist, it is configuration rather than navigation, and a
  two-user studio can be developer-seeded.
- **D-UX-5 — List filter + search state lifted into URL query params** (the missing
  half of D-UI-8). `status`, `client`, `stage`, search `q`, etc. read from and write
  to `useSearchParams`; the list derives its view from the query, not `useState`.
  This unblocks D-UI-13 "view all" deep links, fixes the already-broken
  `/invoices?status=overdue` notification link, lets the palette land on a *scoped*
  list, and completes the return story (filter + scroll + position all restored on
  return). Only meaningful filters go in the URL; the search query write is debounced
  and uses history *replace*, not push, so typing does not spam back-history.
- **D-UX-6 — Sticky scroll-spy section nav on the three rich 360s** (Client, Project,
  Piece). A slim sticky sub-nav under the breadcrumb lists the connected-history
  sections, jump-scrolls to them, and highlights the active one (scroll-spy);
  horizontal-scroll strip on mobile, inline on desktop. **Anchor-scroll, not tabs** —
  tabs would hide content and fragment the "one connected history at a glance"
  purpose of the 360, and break Ctrl-F and browser print (certificates/quotes get
  printed). Sections are deep-linkable (`#financials` scrolls there on load).
  Trigger: ≥4 connected-history sections — light details stay plain scroll, matching
  the D-MS-1 "earn the complexity" rule.

## Consequences

- A navigation context (`from`) is threaded through the palette, toasts, and "view
  all" links; `breadcrumb.tsx` ships on both breakpoints; the `lg:hidden` back links
  are removed.
- New shared `<EmptyState>` component; every page's empty branches refactor to it,
  declaring zero / no-results / section.
- Each list page's filter block refactors from `useState` to `useSearchParams`
  (D-UX-5). Together with D-UI-8 (detail) and D-UX-2 (scroll), the full list+detail
  view state lives in URL + a session scroll cache.
- Overview gains the launchpad and a derived first-run branch.
- The three 360s gain a scroll-spy sub-nav; light details are untouched.
- No backend changes — all client-side composition and routing.

## Alternatives considered

- **Keep fixed "back to list root"** — rejected: palette/toast/"view all" arrivals
  return to a list the user was never on, and desktop has no back at all.
- **Browser-native `history.scrollRestoration`** — rejected: only covers
  hardware Back/Forward (not the programmatic back/breadcrumb) and cannot target a
  non-window scroll panel, so it misses the desktop master-detail case entirely.
- **Per-page hand-rolled empties / just tidy the copy** — rejected: the substantive
  bug is conflating zero-state with no-results; a shared component with explicit
  variants forces the right distinction.
- **Pull the full onboarding/settings wizard into scope** — deferred, not rejected:
  it needs a Settings surface that doesn't exist and is one-time configuration; the
  roadmap preserves it.
- **Keep list filters in component state** — rejected: "view all" and notification
  deep-links become decoration, and return can't restore the filtered view.
- **In-page tabs for the long 360s** — rejected: hides content, fragments the
  at-a-glance history, and breaks find/print. Anchor scroll-spy keeps one continuous,
  jumpable page.
- **Leave 360s as plain long scrolls** — rejected: D-UI-13 roughly doubles Client and
  Project length, so the scroll cost is about to become real.

## Deferred / not yet decided

- Loading/skeleton consistency across pages (each hand-rolls skeletons today) — a
  mechanical follow-up, not grilled here.
- The full guided onboarding/settings wizard (see D-UX-4).
