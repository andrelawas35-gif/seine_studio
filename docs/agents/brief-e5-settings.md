# E5 — Settings & Customization Engineer

## Files owned (exclusive — all new files)

| File / Area | Purpose |
|-------------|---------|
| `src/app/components/SettingsPage.tsx` (new) | Settings UI page |
| `functions/api/settings/` (new) | Settings CRUD API routes |
| `functions/api/cost-catalog/` (new) | Cost catalog CRUD API routes |

## Required reading (before touching code)

1. `CLAUDE.md` — design system, interaction rules, security, data rules
2. `CONTEXT.md` — **tunable parameter**, **cost type**, **cost catalog** definitions
3. `docs/adr/0003-tunable-settings-not-equation-editing.md` — parameters only, no formula editing
4. `docs/agents/handoff-e5-e3-catalog-api.md` — the API contract E3 will consume
5. `docs/agents/domain.md` — how to consume docs

## Wave 3 Tasks (after E4 merges schema)

### 1. Settings page

- **File:** `src/app/components/SettingsPage.tsx` (new)
- Build a Settings page accessible to Owner and Developer roles.
- Present tunable parameters as editable fields with labels, descriptions, and current values.
- Every change writes a dated, attributed `activity_events` row (actor, action="setting_updated", entity_type="setting", entity_id, summary, before/after).
- Parameters to expose (non-exhaustive — read from `settings` table):
  - Default markup percentage
  - Studio buffer percentage
  - VAT rate
  - Daily reminder hour
  - Low-stock threshold
- Follow the French Minimal design: generous whitespace, Playfair headers, DM Sans body, museum gold accents.
- Use searchable combobox (Command primitive) where applicable — no native `<select>`.

### 2. Settings API routes

- **Files:** `functions/api/settings/` (new)
- `GET /api/settings` — list all settings (Owner + Developer only)
- `PUT /api/settings/:key` — update a single setting; writes activity_event
- Auth: verify JWT, check role is owner or developer

### 3. Cost catalog API routes

- **Files:** `functions/api/cost-catalog/` (new)
- `GET /api/cost-catalog` — list all active cost catalog entries, filterable by `cost_type`
- `POST /api/cost-catalog` — create entry (cost_type, description, unit, unit_cost_cents)
- `PUT /api/cost-catalog/:id` — update entry
- `DELETE /api/cost-catalog/:id` — soft-archive (set `is_archived = true`)
- Auth: verify JWT, Owner + Developer only

### 4. Cost catalog UI (within Settings)

- List cost catalog entries grouped by cost type.
- Add/edit/archive inline or via modal.
- Follow the display-case metaphor: each cost type group is a curated panel.

## Cross-engineer contract: E5 ↔ E3

- **Read:** `docs/agents/handoff-e5-e3-catalog-api.md`
- E5 **builds** the cost-catalog API. E3 **consumes** it in `PricingCalculator.tsx`.
- The contract defines the response shape E5 must return and E3 will call.
- E5 does not edit `pricing.ts` or `PricingCalculator.tsx`. E3 does not edit E5's API files.
- The Controller verifies the hand-off contract is satisfied before both are marked complete.

## Design constraints
- Settings page: Owner + Developer access only (gated on `/api/me` role)
- Every change is audited in `activity_events`
- Formulas remain in code — settings expose parameters only
- Touch-first: 44×44px minimum targets

## Acceptance criteria
- Settings page lists all tunable parameters from the DB
- Editing a parameter writes an activity_event and updates the value
- Cost catalog UI lists, creates, edits, and archives entries
- Cost catalog API returns data in the shape specified by the E5↔E3 contract
- Both Owner and Developer roles can access Settings

## Merge constraints
- E5 depends on E4 (schema must have `settings` + `cost_catalog` tables)
- E5 is parallel with E3, E6, E7, E8 in Wave 3 (all disjoint files)
