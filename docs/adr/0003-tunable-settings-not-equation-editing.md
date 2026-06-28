# 0003 — Settings expose tunable parameters, not editable equations

- Status: Accepted
- Date: 2026-06-27
- Deciders: Owner, Developer

## Context

Post-launch the studio wants "a Settings option so the user can adjust equations
or anything on the app that can be adjusted," plus the ability to add, edit, and
delete pricing cost lines by cost type.

The hard constraint (see `CLAUDE.md` → Data rules and `CONTEXT.md`) is that
revenue, balances, inventory value, cost, margin, and profit are **derived from
source records, never manually duplicated**, and that important changes must be
**dated and attributable**. Letting a user rewrite the actual pricing/margin
formulas in the UI would make those derived figures non-reproducible: a quote
saved last month could not be re-derived if the formula changed, and an audit
could not explain how a margin was reached.

Three options were weighed:

1. **Full equation editing** — maximum flexibility, but breaks reproducibility
   and auditability of every derived financial.
2. **Tunable parameters only** — expose named constants the formulas consume.
3. **Nothing configurable** — keep everything hardcoded (rejected: the studio
   has a real, recurring need to adjust markup, buffer, VAT, thresholds).

## Decision

Settings expose **tunable parameters** (named business constants) and a
**cost catalog** of reusable cost lines grouped under a **fixed set of cost
types**. Formulas remain in code. Cost types are a closed enum; users manage the
cost *lines*, not the *types*.

- Tunable parameters and the cost catalog are persisted in the database, not
  hardcoded constants.
- Both the Owner and Developer allowlisted users may edit settings; every change
  writes a dated, attributed `activity_events` row.
- A saved pricing calculation records the parameter values in effect at save
  time (already the pattern in `pricing_versions`), so historical estimates stay
  reproducible even after a parameter later changes.

See `CONTEXT.md` for the definitions of **tunable parameter**, **cost type**, and
**cost catalog**.

## Consequences

- Derived financials stay reproducible and auditable; this is the whole point.
- The UI cannot offer arbitrary formula changes. If a genuinely new formula is
  ever needed, it is a code change with its own review — not a runtime setting.
- A new closed enum (cost types) must be chosen carefully up front, since adding
  or removing a type later touches reporting. Renaming a type's *label* is safe;
  changing the *set* is a migration.
