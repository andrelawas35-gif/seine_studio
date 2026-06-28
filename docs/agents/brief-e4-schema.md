# E4 — Data / Schema Engineer

## Files owned (exclusive — NO ONE ELSE writes migrations)

| File / Area | Purpose |
|-------------|---------|
| `src/server/db/schema.ts` | Drizzle ORM schema — single source of truth for DB structure |
| `drizzle/*` | All migration SQL files and meta snapshots |

## Required reading (before touching code)

1. `CLAUDE.md` — data rules (stock movements append-only, derived quantities, dated/attributable changes)
2. `CONTEXT.md` — **tunable parameter**, **cost type**, **cost catalog**, **consignment**, **consignment count**, **event price list**, **Project** definitions
3. `docs/adr/0003-tunable-settings-not-equation-editing.md` — cost types are a closed enum
4. `docs/adr/0004-consignment-as-distinct-entity.md` — consignment is distinct from event
5. `docs/adr/0005-project-owned-by-event-xor-client.md` — project XOR ownership
6. `docs/agents/domain.md` — how to consume docs

## Wave 2 Task: One ordered migration set

E4 works **alone** in Wave 2. All of Wave 3 gates on E4's merge.

### Migration order (must be sequential)

#### 1. `settings` table
Key/value tunable parameters:
- `id` (uuid PK)
- `key` (text, unique, not null) — e.g., `default_markup_percent`, `studio_buffer_percent`, `vat_rate`, `daily_reminder_hour`, `low_stock_threshold`
- `value` (text, not null) — stored as string; consumer parses
- `description` (text)
- `updatedBy` (uuid → appUsers, not null)
- `updatedAt` (timestamptz, not null)
- Unique index on `key`

#### 2. `cost_type` enum + `cost_catalog` table
**First**, create the `cost_type` Postgres enum. Values **must match E3's `PricingLineCategory` strings exactly:**
```
'material'
'labor'
'design'
'packaging'
'outsourced'
'overhead'
'other'
'stones_gemstones'
'metal_findings'
'finishing_plating'
'setting_engraving'
```

Then create `cost_catalog`:
- `id` (uuid PK)
- `cost_type` (cost_type enum, not null)
- `description` (text, not null)
- `unit` (text, not null)
- `unit_cost_cents` (bigint, not null)
- `is_archived` (boolean, default false)
- `created_by` (uuid → appUsers, not null)
- Timestamps (created_at, updated_at)
- Index on `cost_type`

#### 3. `event_price_list` table
- `id` (uuid PK)
- `event_id` (uuid → events, not null, on delete cascade)
- `catalog_piece_id` (uuid → catalogPieces, not null)
- `price_cents` (bigint, not null)
- `notes` (text)
- Unique on `(event_id, catalog_piece_id)`
- Index on `event_id`

#### 4. `consignment` table
- `id` (uuid PK)
- `name` (text, not null) — partner shop name
- `contact_name` (text)
- `contact_email` (text)
- `contact_phone` (text)
- `address` (text)
- `notes` (text)
- `is_active` (boolean, default true)
- `created_by` (uuid → appUsers, not null)
- Timestamps
- Index on `name`

#### 5. `consignment_count` table
- `id` (uuid PK)
- `consignment_id` (uuid → consignment, not null, on delete cascade)
- `counted_at` (timestamptz, not null) — when the count was taken
- `notes` (text)
- `created_by` (uuid → appUsers, not null)
- Created_at timestamp
- Index on `(consignment_id, counted_at)`

#### `consignment_count_items` table
- `id` (uuid PK)
- `consignment_count_id` (uuid → consignment_count, not null, on delete cascade)
- `inventory_lot_id` (uuid → inventoryLots, not null)
- `counted_quantity` (numeric(18,4), not null)
- `expected_quantity` (numeric(18,4)) — derived on-hand at time of count
- `discrepancy_note` (text)
- Unique on `(consignment_count_id, inventory_lot_id)`

#### 6. `projects` alterations — XOR ownership

Add `event_id` column:
- `event_id` (uuid → events, on delete set null) — already exists in schema but may need migration

Add CHECK constraint:
```sql
CHECK (
  (client_id IS NOT NULL AND event_id IS NULL) OR
  (client_id IS NULL AND event_id IS NOT NULL)
)
```

This enforces ADR-0005: a project belongs to exactly one owner (event XOR client), never both, never neither.

**Important:** Existing rows have `client_id` set and `event_id` null, so they satisfy the constraint. The migration should:
1. Make `client_id` nullable (remove NOT NULL) or keep it as-is and add the CHECK
2. If `client_id` remains NOT NULL, the CHECK only needs to verify `event_id IS NULL OR client_id IS NOT NULL` — but the XOR semantics require exactly one. The cleanest approach: make `client_id` nullable, add the CHECK.

### Migration method
Apply via `npx drizzle-kit generate` then run SQL via Neon SQL API or the MCP `run_sql` tool. Document the migration in `docs/post-deployment-fixes.md`.

## Acceptance criteria
- All 5 new tables + 1 enum + 1 table alteration exist in the database
- `cost_type` enum strings match E3's `PricingLineCategory` exactly (Controller verifies)
- XOR CHECK on projects prevents orphan and dual-owner rows
- Existing data survives the migration
- `drizzle/meta/` snapshots are updated

## Merge constraints
- E4 merges **after** all of Wave 1, **before** any of Wave 3
- No other engineer writes to `schema.ts` or `drizzle/`
- If E3's cost-type strings change during Wave 1, E4 must match them
