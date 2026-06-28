# Hand-off Contract: E5 (Settings) ↔ E3 (Pricing) — Cost Catalog API

## Purpose

E5 builds the cost-catalog API. E3 consumes it in `PricingCalculator.tsx` to replace hardcoded defaults. This document is the contract — neither engineer edits the other's files.

## Owner

- **API surface:** E5 owns `functions/api/cost-catalog/`
- **Consumer:** E3 owns `src/app/pricing.ts` + `src/app/components/PricingCalculator.tsx`

## API Contract

### `GET /api/cost-catalog`

Returns all active (non-archived) cost catalog entries.

**Query params (optional):**
- `cost_type` — filter by a single cost type enum value

**Response shape:**
```json
{
  "entries": [
    {
      "id": "uuid",
      "costType": "material",
      "description": "Freshwater pearl (round, 8mm)",
      "unit": "piece",
      "unitCostCents": 50000,
      "isArchived": false,
      "createdAt": "2026-06-27T00:00:00Z",
      "updatedAt": "2026-06-27T00:00:00Z"
    }
  ]
}
```

**Field notes:**
- `costType` is the **exact string** from the `cost_type` enum. E3 maps these to `PricingLineCategory`.
- `unitCostCents` is in integer centavos (PHP × 100).
- Archived entries (`isArchived: true`) are excluded by default.

### `POST /api/cost-catalog`

Creates a new cost catalog entry.

**Request body:**
```json
{
  "costType": "stones_gemstones",
  "description": "Amethyst cabochon",
  "unit": "carat",
  "unitCostCents": 150000
}
```

**Response:** The created entry (same shape as GET).

### `PUT /api/cost-catalog/:id`

Updates an existing entry. Same body shape as POST.

### `DELETE /api/cost-catalog/:id`

Soft-archives the entry (sets `is_archived = true`). Returns 204.

## How E3 consumes it

E3 calls `GET /api/cost-catalog` (optionally with `?cost_type=material`) and maps the response to `MaterialSuggestion[]`:

```typescript
// In PricingCalculator.tsx — E3's code, NOT E5's
const response = await apiRequest<{ entries: CatalogEntry[] }>("/cost-catalog");
const suggestions: MaterialSuggestion[] = response.entries.map(e => ({
  id: e.id,
  name: e.description,
  unit: e.unit,
  unitCostCentavos: e.unitCostCents,
  source: "Cost catalog",
  category: e.costType as PricingLineCategory,
}));
```

E3 replaces `TRACKER_SUGGESTIONS` and `DEFAULT_LINES` with catalog data.

## Enum string parity (Controller-enforced)

The `costType` strings returned by the API must match the `PricingLineCategory` union in `pricing.ts`. Both match the `cost_type` Postgres enum in `schema.ts`.

**Canonical list (E4's migration is the source of truth):**
```
material, labor, design, packaging, outsourced, overhead, other,
stones_gemstones, metal_findings, finishing_plating, setting_engraving
```

## Verification

Before Wave 3 is marked complete, the Controller:
1. Calls `GET /api/cost-catalog` and verifies the response shape
2. Opens the Pricing Calculator and verifies catalog entries appear as suggestions
3. Confirms no hardcoded tracker constants remain in `PricingCalculator.tsx`
