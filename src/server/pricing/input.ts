import { z } from "zod";

const pricingLineCategory = z.enum(["material", "labor", "design", "packaging", "outsourced", "overhead", "other"]);

const pricingLine = z.object({
  id: z.string().min(1).max(80),
  category: pricingLineCategory,
  description: z.string().trim().max(500),
  quantity: z.number().min(0),
  unit: z.string().trim().min(1).max(40),
  unitCostCentavos: z.number().int().min(0),
});

const pricingMarkup = z.discriminatedUnion("type", [
  z.object({ type: z.literal("fixed"), amountCentavos: z.number().int().min(0) }),
  z.object({ type: z.literal("percentage"), basisPoints: z.number().int().min(0).max(100_00) }),
]);

const pricingInput = z.object({
  lines: z.array(pricingLine).min(1).max(100),
  markup: pricingMarkup,
  discountCentavos: z.number().int().min(0),
  sellingPriceOverrideCentavos: z.number().int().min(0).optional(),
});

export const createPricingCalculationInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

export const createPricingVersionInput = z.object({
  pieceName: z.string().trim().min(1).max(200),
  projectId: z.string().max(100).optional().default(""),
  clientName: z.string().trim().max(200).optional().default(""),
  input: pricingInput,
  totalCostCents: z.number().int().min(0),
  suggestedPriceCents: z.number().int().min(0),
  notes: z.string().trim().max(2000).optional(),
});

export const createReplyTemplateInput = z.object({
  name: z.string().trim().min(1, "Template name is required").max(200),
  category: z.string().trim().min(1, "Category is required").max(80),
});

export const createReplyTemplateVersionInput = z.object({
  body: z.string().trim().min(1, "Body is required").max(10_000),
  variables: z.array(z.string().max(80)).max(50).default([]),
});

export type CreatePricingCalculationInput = z.infer<typeof createPricingCalculationInput>;
export type CreatePricingVersionInput = z.infer<typeof createPricingVersionInput>;
export type CreateReplyTemplateInput = z.infer<typeof createReplyTemplateInput>;
export type CreateReplyTemplateVersionInput = z.infer<typeof createReplyTemplateVersionInput>;
