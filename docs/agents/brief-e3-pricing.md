# E3 — Pricing Engineer

## Files owned (exclusive — no one else edits these)

| File | Purpose |
|------|---------|
| `src/app/pricing.ts` | Pricing model: types, calculator, warnings |
| `src/app/components/PricingCalculator.tsx` | Pricing calculator UI component |

## Required reading (before touching code)

1. `CLAUDE.md` — hard constraints (design system, data rules)
2. `CONTEXT.md` — **cost type**, **cost catalog**, **tunable parameter** definitions (verbatim)
3. `docs/adr/0003-tunable-settings-not-equation-editing.md` — the cost-type enum is **closed**
4. `docs/agents/domain.md` — how to consume docs
5. `docs/agents/handoff-e5-e3-catalog-api.md` — E5↔E3 catalog API contract (Wave 3)

## Wave 1 Task: Add jewelry cost types

### Expand the `PricingLineCategory` union

In `src/app/pricing.ts`, add four new cost types to the union:

```
"stones_gemstones"
"metal_findings"
"finishing_plating"
"setting_engraving"
```

**CRITICAL:** These strings must match **exactly** the enum values E4 writes in `schema.ts` for the `cost_type` enum. The Controller enforces this parity.

### Update CATEGORY_LABEL

Add human-readable labels for the new types. Keep labels consistent with existing ones.

### Update `calculatePricing`

Ensure the new jewelry-specific types are bucketed correctly in the cost breakdown:
- `stones_gemstones` → material cost
- `metal_findings` → material cost
- `finishing_plating` → other direct cost
- `setting_engraving` → labor cost

### Update `PricingCalculator.tsx`

Add the new types to the category selector dropdown. No other UI changes needed in Wave 1.

## Current `PricingLineCategory` (for reference)

```typescript
export type PricingLineCategory =
  | "material"
  | "labor"
  | "design"
  | "packaging"
  | "outsourced"
  | "overhead"
  | "other";
```

This is **additive** — do not remove or rename existing types.

## Wave 3 Tasks (after E4 merges schema + E5 publishes catalog API)

1. Replace hardcoded `DEFAULT_LINES` / `TRACKER_SUGGESTIONS` with data from E5's cost-catalog API.
2. Add **event-pricing mode**: write to `event_price_list` table (schema provided by E4).
3. Snapshot tunable parameter values into saved calculations (ADR-0003).

## Cross-engineer contracts

### E5 ↔ E3 (Wave 3): Catalog API hand-off
- **Read:** `docs/agents/handoff-e5-e3-catalog-api.md`
- E5 builds the API; E3 consumes it.
- E3 must not edit E5's API files; E5 must not edit E3's pricing files.

### E4 ↔ E3: Cost-type string parity
- E3's `PricingLineCategory` strings and E4's `cost_type` Postgres enum must be **identical**.
- The Controller verifies this before E4's migration lands.

## Acceptance criteria
- Four jewelry cost types appear in the category selector
- Calculator correctly buckets the new types
- No existing cost types removed or renamed
- Strings match E4's schema exactly (Controller verifies)
