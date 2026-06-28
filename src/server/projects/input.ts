import { z } from "zod";

const projectStageEnum = z.enum([
  "inquiry", "design", "approved", "production",
  "quality_control", "ready", "delivered", "cancelled",
]);

export const createProjectInput = z.object({
  projectNumber: z.string().trim().min(1, "Project number is required").max(40).optional(),
  clientId: z.string().uuid("Client is required"),
  eventId: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(1, "Title is required").max(200),
  stage: projectStageEnum.optional().default("inquiry"),
  targetDate: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  brief: z.string().trim().max(5000).optional().or(z.literal("")),
  catalogPieceId: z.string().uuid().optional(),
}).transform((input) => ({
  ...input,
  eventId: input.eventId || undefined,
  targetDate: input.targetDate || undefined,
  brief: input.brief || undefined,
  catalogPieceId: input.catalogPieceId || undefined,
}));

export const updateProjectInput = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  clientId: z.string().uuid().optional().nullable().or(z.literal("")),
  eventId: z.string().uuid().optional().nullable().or(z.literal("")),
  stage: projectStageEnum.optional(),
  targetDate: z.string().datetime({ offset: true }).optional().nullable().or(z.literal("")),
  brief: z.string().trim().max(5000).optional().nullable().or(z.literal("")),
  expectedUpdatedAt: z.string().datetime().optional(),
}).refine((input) => Object.keys(input).length > 0, {
  message: "At least one field is required",
}).transform((input) => ({
  ...input,
  clientId: input.clientId === "" ? null : input.clientId,
  eventId: input.eventId === "" ? null : input.eventId,
  targetDate: input.targetDate === "" ? null : input.targetDate,
  brief: input.brief === "" ? null : input.brief,
}));

export const projectListQuery = z.object({
  q: z.string().trim().max(160).default(""),
  stage: projectStageEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateProjectInput = z.infer<typeof createProjectInput>;
export type UpdateProjectInput = z.infer<typeof updateProjectInput>;
