import type { InventoryItem } from "./data";

export interface LocationRecord {
  id: string;
  name: string;
  type: string;
  address: string | null;
  active: boolean;
}

export interface CatalogPieceRecord {
  id: string;
  sku: string;
  name: string;
  category: string;
  collection: string | null;
  metalType: string | null;
  karat: string | null;
  stoneSummary: string | null;
  retailPriceCents: number | null;
  costCents: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLotRecord {
  id: string;
  code: string;
  kind: string;
  catalogPieceId: string | null;
  catalogPieceSku: string | null;
  catalogPieceName: string | null;
  description: string;
  unit: string;
  initialQuantity: string;
  unitCostCents: number | null;
  onHandQuantity: string;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
  source: "database" | "fixture";
}

export interface StockMovementRecord {
  id: string;
  type: string;
  quantity: string;
  reason: string;
  occurredAt: string;
  fromLocationName: string | null;
  toLocationName: string | null;
  createdByName: string;
}

export interface InventoryLotFormValues {
  code: string;
  kind: string;
  catalogPieceId: string;
  description: string;
  unit: string;
  initialQuantity: string;
  unitCostCents: string;
  locationId: string;
}

export const EMPTY_LOT_FORM: InventoryLotFormValues = {
  code: "",
  kind: "material",
  catalogPieceId: "",
  description: "",
  unit: "pcs",
  initialQuantity: "",
  unitCostCents: "",
  locationId: "",
};

export interface StockMovementFormValues {
  type: string;
  quantity: string;
  fromLocationId: string;
  toLocationId: string;
  reason: string;
}

export const EMPTY_MOVEMENT_FORM: StockMovementFormValues = {
  type: "receipt",
  quantity: "",
  fromLocationId: "",
  toLocationId: "",
  reason: "",
};

export function fixtureToLotRecord(item: InventoryItem): InventoryLotRecord {
  const kindMap: Record<string, string> = {
    Gold: "material",
    Silver: "material",
    Pearls: "material",
    Gemstones: "material",
    Findings: "supply",
  };
  return {
    id: item.id,
    code: item.id,
    kind: kindMap[item.category] ?? "material",
    catalogPieceId: null,
    catalogPieceSku: null,
    catalogPieceName: null,
    description: item.name,
    unit: item.unit,
    initialQuantity: String(item.quantity),
    unitCostCents: Math.round(item.costPerUnit * 100),
    onHandQuantity: String(item.quantity),
    receivedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: "fixture",
  };
}

export function stockStatusFromQuantity(onHand: number, reorderAt = 5): "Sufficient" | "Low" | "Out" {
  if (onHand <= 0) return "Out";
  if (onHand <= reorderAt) return "Low";
  return "Sufficient";
}
