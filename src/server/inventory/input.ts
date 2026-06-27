import { z } from "zod";

// ─── Locations ───────────────────────────────────────────────────────────────

const locationTypeEnum = z.enum(["studio", "storage", "event", "consignment", "client", "other"]);

export const createLocationInput = z.object({
  name: z.string().trim().min(1, "Location name is required").max(160),
  type: locationTypeEnum,
  address: z.string().trim().max(500).optional().or(z.literal("")),
}).transform((input) => ({
  ...input,
  address: input.address || undefined,
}));

export const updateLocationInput = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  type: locationTypeEnum.optional(),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  active: z.boolean().optional(),
}).refine((input) => Object.keys(input).length > 0, {
  message: "At least one field is required",
}).transform((input) => ({
  ...input,
  address: input.address === "" ? null : input.address,
}));

// ─── Catalog Pieces ──────────────────────────────────────────────────────────

export const createCatalogPieceInput = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(40),
  name: z.string().trim().min(1, "Name is required").max(200),
  category: z.string().trim().min(1, "Category is required").max(80),
  collection: z.string().trim().max(100).optional().or(z.literal("")),
  metalType: z.string().trim().max(80).optional().or(z.literal("")),
  karat: z.string().trim().max(20).optional().or(z.literal("")),
  stoneSummary: z.string().trim().max(500).optional().or(z.literal("")),
  retailPriceCents: z.number().int().min(0).optional(),
  costCents: z.number().int().min(0).optional(),
}).transform((input) => ({
  ...input,
  collection: input.collection || undefined,
  metalType: input.metalType || undefined,
  karat: input.karat || undefined,
  stoneSummary: input.stoneSummary || undefined,
}));

export const updateCatalogPieceInput = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  collection: z.string().trim().max(100).optional().or(z.literal("")),
  metalType: z.string().trim().max(80).optional().or(z.literal("")),
  karat: z.string().trim().max(20).optional().or(z.literal("")),
  stoneSummary: z.string().trim().max(500).optional().or(z.literal("")),
  retailPriceCents: z.number().int().min(0).optional().nullable(),
  costCents: z.number().int().min(0).optional().nullable(),
}).refine((input) => Object.keys(input).length > 0, {
  message: "At least one field is required",
}).transform((input) => ({
  ...input,
  collection: input.collection === "" ? null : input.collection,
  metalType: input.metalType === "" ? null : input.metalType,
  karat: input.karat === "" ? null : input.karat,
  stoneSummary: input.stoneSummary === "" ? null : input.stoneSummary,
}));

// ─── Inventory Lots ──────────────────────────────────────────────────────────

const inventoryKindEnum = z.enum(["material", "finished_piece", "packaging", "supply"]);

export const createInventoryLotInput = z.object({
  code: z.string().trim().min(1, "Lot code is required").max(40),
  kind: inventoryKindEnum,
  catalogPieceId: z.string().uuid().optional(),
  description: z.string().trim().min(1, "Description is required").max(500),
  unit: z.string().trim().min(1, "Unit is required").max(20),
  initialQuantity: z.string().regex(/^\d+(\.\d{1,4})?$/, "Quantity must be a positive number"),
  unitCostCents: z.number().int().min(0).optional(),
  locationId: z.string().uuid("Location is required"),
});

export const updateInventoryLotInput = z.object({
  description: z.string().trim().min(1).max(500).optional(),
  unitCostCents: z.number().int().min(0).optional().nullable(),
}).refine((input) => Object.keys(input).length > 0, {
  message: "At least one field is required",
});

// ─── Stock Movements ─────────────────────────────────────────────────────────

// `adjustment` is intentionally excluded — a directionless adjustment with a
// positive-only quantity is ambiguous. Use adjustment_increase / adjustment_decrease.
const stockMovementTypeEnum = z.enum([
  "receipt", "reserve", "release", "transfer", "consume",
  "sale", "return", "adjustment_increase", "adjustment_decrease", "damage", "loss",
]);

export const createStockMovementInput = z.object({
  inventoryLotId: z.string().uuid("Inventory lot is required"),
  type: stockMovementTypeEnum,
  quantity: z.string().regex(/^\d+(\.\d{1,4})?$/, "Quantity must be a positive number"),
  fromLocationId: z.string().uuid().optional(),
  toLocationId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  reason: z.string().trim().min(1, "Reason is required").max(500),
}).refine(
  (input) => input.fromLocationId || input.toLocationId,
  { message: "At least one location (from or to) is required" },
);

// ─── Common ──────────────────────────────────────────────────────────────────

export const listQuery = z.object({
  q: z.string().trim().max(160).default(""),
  kind: inventoryKindEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const uuidParam = z.string().uuid("ID is invalid");

export type CreateLocationInput = z.infer<typeof createLocationInput>;
export type CreateCatalogPieceInput = z.infer<typeof createCatalogPieceInput>;
export type CreateInventoryLotInput = z.infer<typeof createInventoryLotInput>;
export type CreateStockMovementInput = z.infer<typeof createStockMovementInput>;
