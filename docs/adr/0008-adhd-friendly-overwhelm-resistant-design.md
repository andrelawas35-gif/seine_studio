# 0008 — ADHD-friendly, overwhelm-resistant design

- Status: Accepted
- Date: 2026-06-28
- Deciders: Owner, Developer (grilling session)
- Amends: [ADR 0005](0005-ui-workflow-and-organization.md) (D-UI-3 Needs Attention,
  the notification badge) and the app-wide status-color usage.
- Builds on: [ADR 0006](0006-multi-step-mobile-flows.md) (drafts/resume) and
  [ADR 0007](0007-navigation-and-ux-connective-tissue.md) (EmptyState, launchpad).

## Context

The studio owner — the app's primary daily user — gets overwhelmed easily and may
have ADHD. This is treated as a concrete design constraint (low cognitive load,
overwhelm-resistance, interruption recovery), not a medical matter; the resulting
design is good for everyone and load-bearing for her.

The prior ADRs already lean calm (stepped flows chunk work, drafts recover it, the
French-Minimal aesthetic is uncluttered) but they optimized for *workflow
correctness*, not *overwhelm-resistance*, and in places pull the wrong way:

- The notification bell shows a red **count** badge (`notifications.length` → "9+") —
  a number that announces "many things are wrong."
- The Overview's **Needs Attention** list (D-UI-3) has no cap — a potentially endless
  backlog that induces freeze.
- Status is shown largely through **saturated color** (43 `text-red`, 28 `bg-red`,
  heavy amber, ~43 ad-hoc `STATUS_*` maps), so the app sits in constant low-grade
  alarm — including terminal states (cancelled/declined) that are *done*, not urgent.
- Unfinished drafts live in IndexedDB but nothing **surfaces** them, so an interrupted
  task becomes an invisible dropped thread.
- Nothing tells the user she is **done** — no "caught up" state, no goal-completion
  signal.

## Governing principles (the ADHD-friendly lens)

Every screen and future decision is checked against these five. Recorded in
`CONTEXT.md`.

1. **One obvious next thing.** Each screen makes the single most likely action
   unmistakable; everything else is quieter. Never a wall of equal choices.
2. **Never make her hold state in her head.** The app remembers where she was, what's
   unfinished, and what's next — working memory lives on screen.
3. **Calm by default; alarm is earned and rare.** Visual urgency (red, badges, counts)
   is reserved for the genuinely time-critical and is bounded. Calm is the resting
   state.
4. **Bounded, not endless.** Attention-demanding lists are capped and prioritized to a
   doable few; the app never presents an infinite backlog.
5. **Closure is designed.** The app explicitly tells her when she is caught up and when
   a goal is complete — permission to stop is as important as guidance to act.

## Decisions

- **D-ADHD-1 — Adopt the five governing principles above as an explicit, recorded
  lens.** They are the shared test for "is this overwhelming?" and govern the
  decisions below and all future UI work.
- **D-ADHD-2 — One bounded, calm attention surface; kill the count.** (Amends D-UI-3
  and the notification badge.)
  - The Overview's Needs Attention becomes the single home for "what needs me,"
    renamed gently ("Today" / "Needs you"). The separate notifications bell stops being
    a second inbox — removed on desktop, a quiet pointer to the Overview on mobile.
  - The count badge becomes a **presence dot** (something / nothing), never a number.
  - The list is **capped to a prioritized top 3** (ranked by the signals module,
    D-UI-4) with "show the rest" collapsed — a doable few, not a backlog.
  - Items read as gentle **next-actions** ("Maria's deposit is overdue — send a
    reminder"), not red alarm tags.
- **D-ADHD-3 — Three-tier status-severity model; neutral is the default, red is
  rationed.** (Amends the status-color sprawl; extends the CONTEXT.md "gold is never a
  status color" rule into a full system.)
  - **Neutral (default):** informational states (draft, active, delivered, declined,
    cancelled, paid) — muted ink + a quiet dot, no saturated color. Most statuses live
    here. **Terminal states are neutral, not red** — cancelled/declined are done, not
    on fire.
  - **Amber (soft):** approaching/mild (due soon, low stock, margin below target).
  - **Red (urgent, rationed):** genuinely time-critical / money-at-risk (payment
    overdue, past deadline) — only here, and only on the rows that have it.
  - **Color marks the exception row, not every row.** A list shows mostly calm rows so
    the eye lands on what needs action. One shared severity function app-wide replaces
    the ad-hoc per-page `STATUS_*` color maps.
- **D-ADHD-4 — A global "Pick up where you left off" resume surface.** (Extends D-MS-5
  from passive to active recall; principle 2.)
  - A resume strip on the Overview lists unfinished `useDraft` drafts across *all*
    entities, each a one-tap resume into the right flow at the saved step
    (`currentStep`, D-MS-5).
  - Derived, **bounded** (top few + "show all drafts"), self-clearing on submit/discard,
    with **frictionless inline discard** and **auto-expiry** of drafts untouched for N
    days. Absent when nothing is open — a small "caught up" signal.
- **D-ADHD-5 — Default everything defaultable; confirm, don't originate.** (Sharpens
  the existing assisted-entry rule; principle 1.)
  - Every field that can have a sensible default gets one (dates = today, deposit % =
    studio default, payment method = last used, Manila currency/timezone), shown with
    **visible provenance** ("From accepted quote," "Default 50%") so it's trusted and
    obviously overridable.
  - **One decision in focus at a time**; non-essential fields demoted to
    optional/collapsed (ties to "Additional details," D-MS-7).
  - **Consequential fields are never silently defaulted** — payment *amount*, *which*
    piece sold are the things she actively confirms. Default the ceremony, surface the
    substance.
- **D-ADHD-6 — Closure is a designed, first-class state.** (Principle 5.)
  - **Empty attention is a warm endpoint** — an explicit "You're all caught up"
    (`<EmptyState>` zero-variant), not a blank.
  - **Confirm the goal, not just the action** — beyond the D-UI-6 toast, surface
    milestone completion ("Deposit recorded — Maria's project is now fully paid").
  - **Lists have bottoms** — finite/paginated working surfaces, no infinite scroll.
  - **A daily sense of done** — when the day's items are cleared, the Overview reflects
    "Nothing else needs you today."

## Consequences

- The attention model consolidates to one surface; the notification badge and bell are
  reworked (count → dot, bell → pointer). D-UI-3's Needs Attention is capped + renamed.
- A shared status-severity function replaces per-page color maps; a sweep desaturates
  terminal/informational states across all pages.
- The Overview gains two derived strips (resume + closure states) alongside the
  launchpad (D-UX-4) — all bounded so the Overview itself stays calm.
- Create flows get a defaults/provenance audit and a required-field reduction pass.
- These are presentation/composition changes; the only data-adjacent addition is
  draft auto-expiry. No new backend surface.

## The loop

Bounded attention (D-ADHD-2) + active resume (D-ADHD-4) + designed closure (D-ADHD-6)
form one sustainable loop: **here's the doable few → here's what you left open →
you're done.** Calm by default (D-ADHD-3) and confirm-don't-originate (D-ADHD-5) keep
each step low-load. This is what makes the calm sustainable rather than momentary.

## Alternatives considered

- **Keep both attention surfaces / the full uncapped list for transparency** —
  rejected: two anxious inboxes and an endless backlog are the overwhelm we set out to
  remove. "Show the rest" preserves access without making the backlog the default view.
- **Keep the count badge** — rejected: the number is precisely what spikes anxiety; a
  dot conveys the same actionable fact (there's something) calmly.
- **Richer per-status coloring for at-a-glance differentiation** — rejected: when every
  state is colored, none reads as urgent and the screen is loud. Neutral-default makes
  the few colored states meaningful.
- **Keep drafts invisible until reopened (D-MS-5 only)** — rejected: the core need is
  that she *won't remember* she started something; recall must be active.
- **Ask every field explicitly to avoid autopilot errors** — rejected in favor of
  visible-labeled defaults with consequential fields never auto-defaulted; the autopilot
  risk is mitigated without reintroducing decision paralysis.
- **Treat closure as implicit (empty lists speak for themselves)** — rejected: explicit
  "done" states are the counterpart to focus and the thing that makes sustained use
  feel safe.
