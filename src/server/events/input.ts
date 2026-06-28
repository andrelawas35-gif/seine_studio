import { z } from "zod";

export const eventStageEnum = z.enum([
  "draft",
  "planning",
  "packing",
  "ready",
  "active",
  "reconciliation",
  "closed",
  "cancelled",
]);

export const taskStatusEnum = z.enum(["not_started", "in_progress", "blocked", "complete"]);

export const createEventInput = z
  .object({
    name: z.string().trim().min(1, "Event name is required").max(200),
    type: z.string().trim().min(1, "Event type is required").max(80),
    organizer: z.string().trim().max(160).optional().or(z.literal("")),
    venue: z.string().trim().max(200).optional().or(z.literal("")),
    instagramHandle: z.string().trim().max(80).optional().or(z.literal("")),
    address: z.string().trim().max(500).optional().or(z.literal("")),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    revenueTargetCents: z.number().int().min(0).optional(),
    budgetCents: z.number().int().min(0).optional(),
    studioBufferPercent: z.number().int().min(0).max(100).default(0),
    notes: z.string().trim().max(5000).optional().or(z.literal("")),
  })
  .refine((input) => new Date(input.endsAt) >= new Date(input.startsAt), {
    message: "End date must be on or after the start date",
    path: ["endsAt"],
  })
  .transform((input) => ({
    ...input,
    organizer: input.organizer || undefined,
    venue: input.venue || undefined,
    instagramHandle: input.instagramHandle?.replace(/^@/, "") || undefined,
    address: input.address || undefined,
    notes: input.notes || undefined,
  }));

export const createEventTaskInput = z.object({
  title: z.string().trim().min(1, "Task title is required").max(240),
  dueAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const updateEventTaskInput = z
  .object({
    status: taskStatusEnum.optional(),
    title: z.string().trim().min(1).max(240).optional(),
    notes: z.string().trim().max(2000).optional().nullable(),
  })
  .refine((input) => Object.keys(input).length > 0, { message: "At least one field is required" });

export const createEventBudgetLineInput = z.object({
  category: z.string().trim().min(1, "Category is required").max(80),
  description: z.string().trim().min(1, "Description is required").max(240),
  plannedAmountCents: z.number().int().min(0),
});

export const createEventAllocationInput = z.object({
  inventoryLotId: z.string().uuid("Inventory batch is required"),
  sourceLocationId: z.string().uuid("Source location is required"),
  plannedQuantity: z.string().regex(/^\d+(\.\d{1,4})?$/, "Quantity must be positive"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const eventListQuery = z.object({
  stage: eventStageEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const DEFAULT_EVENT_TASKS = [
  "Confirm venue, fees, and organizer requirements",
  "Plan stock pull and studio buffer",
  "Prepare displays, mirrors, lighting, and signage",
  "Print price labels and packing list",
  "Pack certificates, care cards, and packaging",
  "Confirm payment methods, cash float, and receipts",
  "Pack chargers and internet backup",
  "Record opening inventory count and condition",
  "Record closing count and review discrepancies",
  "Follow up on event inquiries",
] as const;
