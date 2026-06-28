import { z } from "zod";

const projectStageEnum = z.enum([
  "inquiry", "consultation", "design", "approved", "sourcing", "production",
  "quality_control", "ready", "delivered", "closed", "cancelled",
]);

export const createProjectInput = z.object({
  projectNumber: z.string().trim().min(1, "Project number is required").max(40),
  clientId: z.string().uuid().optional().or(z.literal("")),
  eventId: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(1, "Title is required").max(200),
  stage: projectStageEnum.optional().default("inquiry"),
  targetDate: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  brief: z.string().trim().max(5000).optional().or(z.literal("")),
}).refine(
  // A project belongs to exactly one owner: a client XOR an event (ADR-0005,
  // enforced by the projects_owner_xor DB CHECK). Reject neither-or-both here so
  // the constraint never trips at write time.
  (input) => Boolean(input.clientId) !== Boolean(input.eventId),
  { message: "A project must belong to a client or an event, but not both.", path: ["clientId"] },
).transform((input) => ({
  ...input,
  clientId: input.clientId || undefined,
  eventId: input.eventId || undefined,
  targetDate: input.targetDate || undefined,
  brief: input.brief || undefined,
}));

export const updateProjectInput = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  clientId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional().nullable().or(z.literal("")),
  stage: projectStageEnum.optional(),
  targetDate: z.string().datetime({ offset: true }).optional().nullable().or(z.literal("")),
  brief: z.string().trim().max(5000).optional().nullable().or(z.literal("")),
  expectedUpdatedAt: z.string().datetime().optional(),
}).refine((input) => Object.keys(input).length > 0, {
  message: "At least one field is required",
}).transform((input) => ({
  ...input,
  eventId: input.eventId === "" ? null : input.eventId,
  targetDate: input.targetDate === "" ? null : input.targetDate,
  brief: input.brief === "" ? null : input.brief,
}));

export const projectListQuery = z.object({
  q: z.string().trim().max(160).default(""),
  stage: projectStageEnum.optional(),
  eventId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateProjectInput = z.infer<typeof createProjectInput>;
export type UpdateProjectInput = z.infer<typeof updateProjectInput>;
