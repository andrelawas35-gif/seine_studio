import { z } from "zod";

// ─── Quotes ──────────────────────────────────────────────────────────────────

export const createQuoteInput = z.object({
  clientId: z.string().uuid("Valid client is required"),
  projectId: z.string().uuid().optional(),
  pricingVersionId: z.string().uuid().optional(),
  depositPercent: z.number().int().min(0).max(100).optional(),
  terms: z.string().trim().max(2000).optional(),
  validUntil: z.string().datetime().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const createQuoteVersionInput = z.object({
  /** Immutable pricing + line-item snapshot */
  snapshot: z.record(z.string(), z.unknown()),
});

export const updateQuoteInput = z.object({
  status: z
    .enum(["draft", "sent", "accepted", "declined", "expired"])
    .optional(),
  depositPercent: z.number().int().min(0).max(100).optional(),
  terms: z.string().trim().max(2000).optional(),
  validUntil: z.string().datetime().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const convertQuoteInput = z.object({
  projectId: z.string().uuid().optional(),
  depositPercent: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().datetime().optional(),
});

// ─── Invoices ────────────────────────────────────────────────────────────────

export const createInvoiceInput = z.object({
  clientId: z.string().uuid("Valid client is required"),
  projectId: z.string().uuid().optional(),
  quoteId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  currency: z.string().min(1).max(3).default("PHP"),
  subtotalCents: z.number().int().min(0),
  discountCents: z.number().int().min(0).default(0),
  taxCents: z.number().int().min(0).default(0),
  totalCents: z.number().int().min(0),
  depositPercent: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().datetime().optional(),
  lineItemsSnapshot: z.array(z.record(z.string(), z.unknown())).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateInvoiceStatusInput = z.object({
  status: z.enum(["draft", "sent", "void", "refunded"]),
  voidReason: z.string().trim().max(1000).optional(),
});

// ─── Payments ────────────────────────────────────────────────────────────────

export const createPaymentInput = z.object({
  invoiceId: z.string().uuid("Valid invoice is required"),
  amountCents: z.number().int().min(1, "Amount must be positive"),
  method: z.enum(["bank_transfer", "cash", "card", "gcash", "maya", "other"]),
  externalReference: z.string().trim().max(200).optional(),
  feesCents: z.number().int().min(0).default(0),
  receivedAt: z.string().datetime(),
  notes: z.string().trim().max(1000).optional(),
});

// ─── Suppliers ───────────────────────────────────────────────────────────────

export const createSupplierInput = z.object({
  name: z.string().trim().min(1, "Supplier name is required").max(200),
  contactName: z.string().trim().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional(),
  category: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const updateSupplierInput = createSupplierInput.partial();

// ─── Expenses ────────────────────────────────────────────────────────────────

export const createExpenseInput = z.object({
  supplierId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  category: z.enum([
    "materials",
    "stones",
    "findings",
    "packaging",
    "labor",
    "shipping",
    "rent",
    "utilities",
    "marketing",
    "travel",
    "tools",
    "professional_fees",
    "other_opex",
  ]),
  description: z.string().trim().min(1, "Description is required").max(500),
  amountCents: z.number().int().min(1, "Amount must be positive"),
  method: z.enum(["bank_transfer", "cash", "card", "gcash", "maya", "other"]).optional(),
  receiptUrl: z.string().url().optional().or(z.literal("")),
  incurredAt: z.string().datetime(),
  isCogs: z.boolean().default(false),
  notes: z.string().trim().max(2000).optional(),
});

export const updateExpenseInput = createExpenseInput.partial();

// ─── Type exports ────────────────────────────────────────────────────────────

export type CreateQuoteInput = z.infer<typeof createQuoteInput>;
export type CreateQuoteVersionInput = z.infer<typeof createQuoteVersionInput>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteInput>;
export type ConvertQuoteInput = z.infer<typeof convertQuoteInput>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceInput>;
export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusInput>;
export type CreatePaymentInput = z.infer<typeof createPaymentInput>;
export type CreateSupplierInput = z.infer<typeof createSupplierInput>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierInput>;
export type CreateExpenseInput = z.infer<typeof createExpenseInput>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseInput>;
