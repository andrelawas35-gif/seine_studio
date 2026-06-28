# Controller — Master Sequencing & Merge Order

## Role of the Controller

The Controller integrates and sequences. It **writes no feature code.** Its responsibilities:

1. **Own the merge order.** Release work in waves. Never unblock a downstream engineer before its schema dependency has merged.
2. **Enforce the anti-collision contract.** Each file has exactly one owner. No two engineers edit the same file concurrently.
3. **Keep enum strings identical** between E3 (code: `PricingLineCategory`) and E4 (DB: `cost_type` enum). This is the one cross-cutting invariant that must not drift.
4. **Run verification checkpoints.** After each wave merge, verify in preview before unblocking the next wave.
5. **Manage hand-off contracts.** E5↔E3 catalog API and E6↔E7 event-stock list are resolved by specs, not shared edits.
6. **Make the single App.tsx edit** if E6 needs a nav route — E6 specifies, E1 implements.
7. **Keep docs updated.** `docs/post-deployment-fixes.md`, `CONTEXT.md`, and ADRs reflect reality after each wave.

## The anti-collision contract (non-negotiable)

| File / area | Sole owner | Others |
|---|---|---|
| `src/app/App.tsx`, `src/app/auth.ts`, `src/app/api.ts` | **E1** | Read-only |
| `src/app/notifications.ts`, `src/sw.ts` | **E1** | Read-only |
| `src/app/components/CertificatesPage.tsx`, `RepairsPage.tsx`, `Modal.tsx` | **E2** | Read-only |
| `src/app/pricing.ts`, `src/app/components/PricingCalculator.tsx` | **E3** | Read-only |
| `src/server/db/schema.ts`, `drizzle/*` | **E4** | No one else writes migrations |
| `src/app/components/SettingsPage.tsx`, `functions/api/settings/`, `functions/api/cost-catalog/` | **E5** | New files only |
| `src/app/components/EventsPage.tsx`, `src/app/pages/CorePages.tsx` (Overview widget), `functions/api/events/` | **E6** | E6's widget lives in OverviewPage, NOT App.tsx |
| `src/app/components/ProjectsPage.tsx`, `functions/api/projects/` | **E7** | |
| `src/app/components/ConsignmentPage.tsx`, `functions/api/consignment/` | **E8** | All-new files |
| `docs/agents/search-audit.md`, `docs/agents/db-audit.md` | **E9** | Read-only on code |

## Wave 1 — Phase A fixes + audits (parallel, no dependencies)

**Status:** Ready to start. All 4 engineers run simultaneously.

### Merge order within Wave 1
No dependencies — merge in any order as each completes.

### E1: Shell & Auth
- **Brief:** `docs/agents/brief-e1-shell-auth.md`
- **Files:** `App.tsx`, `auth.ts`, `api.ts`, `notifications.ts`, `sw.ts`
- **Controller check:** Verify VAPID key regenerated, auth bounce fixed, scroll wall contained on mobile preview

### E2: Forms & UI
- **Brief:** `docs/agents/brief-e2-forms-ui.md`
- **Files:** `CertificatesPage.tsx`, `RepairsPage.tsx`, `Modal.tsx`
- **Controller check:** Verify cert + repair modals scroll on mobile viewport

### E3 (Wave 1 slice): Pricing cost types
- **Brief:** `docs/agents/brief-e3-pricing.md`
- **Files:** `pricing.ts`, `PricingCalculator.tsx`
- **Controller check:** Verify 4 new cost types appear in dropdown. Confirm strings match what E4 will use.

### E9: Audit (read-only)
- **Brief:** `docs/agents/brief-e9-audit.md`
- **Output:** `docs/agents/search-audit.md`, `docs/agents/db-audit.md`
- **Controller check:** Review findings. File actionable bugs as GitHub Issues.

### Wave 1 gate → Wave 2
**Gate condition:** E1, E2, E3-slice, and E9 all merged.
**Controller action:** 
1. Run full preview. Verify all fixes.
2. Confirm E3's cost-type strings. Lock them as canonical.
3. Hand canonical strings to E4. Unblock Wave 2.

---

## Wave 2 — Schema foundation (E4 alone, serialized)

**Status:** Blocked on Wave 1 completion.

### E4: Data / Schema
- **Brief:** `docs/agents/brief-e4-schema.md`
- **Files:** `schema.ts`, `drizzle/*`
- **Controller check (pre-merge):** Verify E4's `cost_type` enum strings match E3's `PricingLineCategory` exactly.
- **Controller check (post-merge):** Verify all 6 migration steps applied. Verify XOR CHECK enforces correctly.

### Cost-type string parity (Controller-enforced)

| E3 code (`PricingLineCategory`) | E4 DB (`cost_type` enum) |
|---|---|
| `material` | `material` |
| `labor` | `labor` |
| `design` | `design` |
| `packaging` | `packaging` |
| `outsourced` | `outsourced` |
| `overhead` | `overhead` |
| `other` | `other` |
| `stones_gemstones` | `stones_gemstones` |
| `metal_findings` | `metal_findings` |
| `finishing_plating` | `finishing_plating` |
| `setting_engraving` | `setting_engraving` |

These must be identical character-for-character. The Controller rejects any E4 migration that doesn't match.

### Wave 2 gate → Wave 3
**Gate condition:** E4 merged. All 6 migration steps applied to the database.
**Controller action:**
1. Run `GET /api/health` — verify DB connection.
2. Query `information_schema.tables` — verify `settings`, `cost_catalog`, `event_price_list`, `consignment`, `consignment_count`, `consignment_count_items` exist.
3. Query `projects` — verify `event_id` column and XOR CHECK exist.
4. Unblock all of Wave 3 simultaneously.

---

## Wave 3 — Feature builds (5 engineers in parallel)

**Status:** Blocked on Wave 2 (E4's schema merge).
**Parallelism:** All 5 engineers work simultaneously. They own disjoint files.

### E5: Settings
- **Brief:** `docs/agents/brief-e5-settings.md`
- **Depends on:** E4's `settings` + `cost_catalog` tables
- **Cross-contract:** `docs/agents/handoff-e5-e3-catalog-api.md` (E5 builds API, E3 consumes)
- **Controller check:** Verify settings page lists tunable parameters. Verify cost-catalog API returns correct shape per contract.

### E3 (Wave 3 slice): Pricing catalog + event mode
- **Brief:** `docs/agents/brief-e3-pricing.md` (Wave 3 section)
- **Depends on:** E4's schema + E5's catalog API
- **Controller check:** Verify PricingCalculator reads from catalog API. Verify event-pricing mode writes to `event_price_list`.

### E6: Events
- **Brief:** `docs/agents/brief-e6-events.md`
- **Depends on:** E4's schema
- **Cross-contract:** `docs/agents/handoff-e6-e7-event-stock.md` (E7 provides projects, E6 displays)
- **Controller check:** Verify calendar widget on home screen. Verify event price list UI.

### E7: Projects
- **Brief:** `docs/agents/brief-e7-projects.md`
- **Depends on:** E4's schema (XOR CHECK, event_id)
- **Cross-contract:** `docs/agents/handoff-e6-e7-event-stock.md`
- **Controller check:** Verify XOR ownership in project form. Verify cost estimate doesn't create stock movements.

### E8: Consignment
- **Brief:** `docs/agents/brief-e8-consignment.md`
- **Depends on:** E4's schema (`consignment` + `consignment_count` tables)
- **Lowest collision risk** — all-new files.
- **Controller check:** Verify consignment page, count flow, no edits to event files.

### Wave 3 gate → Done
**Gate condition:** All 5 engineers merged.
**Controller action (final integration pass):**
1. E6→E1 nav spec: if E6 filled `docs/agents/handoff-e6-e1-nav.md`, E1 makes the single edit.
2. Run full preview. Smoke-test all pages.
3. Verify E5↔E3 contract: catalog entries appear in PricingCalculator.
4. Verify E6↔E7 contract: event-owned projects appear in event detail.
5. Update `docs/post-deployment-fixes.md` — mark all items resolved.
6. Tag release.

---

## File collision heat map

```
                    App.tsx  auth.ts  api.ts  notif.ts  sw.ts  CertPage  RepairPage  Modal  pricing.ts  PricingCalc  schema.ts  Settings*  Events*  Projects*  Consign*
E1 (Shell/Auth)       🟢      🟢       🟢      🟢       🟢      -         -          -       -          -            -          -         -        -          -
E2 (Forms/UI)          -       -        -       -        -      🟢        🟢         🟢      -          -            -          -         -        -          -
E3 (Pricing)           -       -        -       -        -      -         -          -      🟢         🟢            -          -         -        -          -
E4 (Schema)            -       -        -       -        -      -         -          -       -          -           🟢          -         -        -          -
E5 (Settings)          -       -        -       -        -      -         -          -       -          -            -         🟢         -        -          -
E6 (Events)            -       -        -       -        -      -         -          -       -          -            -          -        🟢        -          -
E7 (Projects)          -       -        -       -        -      -         -          -       -          -            -          -         -       🟢          -
E8 (Consignment)       -       -        -       -        -      -         -          -       -          -            -          -         -        -         🟢
E9 (Audit)           read-only on all files — writes findings docs only
```

Legend: 🟢 = owns and edits, - = does not touch, * = new files

---

## Engineer briefs index

| Engineer | Brief file |
|----------|-----------|
| E1 Shell/Auth | `docs/agents/brief-e1-shell-auth.md` |
| E2 Forms/UI | `docs/agents/brief-e2-forms-ui.md` |
| E3 Pricing | `docs/agents/brief-e3-pricing.md` |
| E4 Data/Schema | `docs/agents/brief-e4-schema.md` |
| E5 Settings | `docs/agents/brief-e5-settings.md` |
| E6 Events | `docs/agents/brief-e6-events.md` |
| E7 Projects | `docs/agents/brief-e7-projects.md` |
| E8 Consignment | `docs/agents/brief-e8-consignment.md` |
| E9 Audit | `docs/agents/brief-e9-audit.md` |

## Hand-off contracts index

| Contract | File |
|----------|------|
| E5↔E3 Catalog API | `docs/agents/handoff-e5-e3-catalog-api.md` |
| E6↔E7 Event Stock | `docs/agents/handoff-e6-e7-event-stock.md` |
| E6→E1 Nav Spec | `docs/agents/handoff-e6-e1-nav.md` |

---

## Quick-start: launching an engineer

To launch a cold agent as engineer E*N*:
1. Direct the agent to read `CLAUDE.md` + `CONTEXT.md` first
2. Then its specific brief at `docs/agents/brief-eN-*.md`
3. Then any ADR or hand-off contract referenced in its brief
4. The agent works only on the files listed in its brief
5. The Controller verifies and merges
