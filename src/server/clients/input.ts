import { z } from "zod";

const optionalContact = z
  .string()
  .trim()
  .max(160)
  .optional()
  .transform((value) => value || undefined);

const clientFields = z.object({
  name: z.string().trim().min(1, "Client name is required").max(160),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: optionalContact,
  instagramHandle: optionalContact,
  preferences: z.string().trim().max(2_000).optional().or(z.literal("")),
  notes: z.string().trim().max(5_000).optional().or(z.literal("")),
});

export const createClientInput = clientFields
  .transform((input) => ({
    ...input,
    email: input.email || undefined,
    instagramHandle: input.instagramHandle?.replace(/^@/, ""),
    preferences: input.preferences || undefined,
    notes: input.notes || undefined,
  }));

export const clientListQuery = z.object({
  q: z.string().trim().max(160).default(""),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

export const updateClientInput = clientFields
  .partial()
  .extend({ expectedUpdatedAt: z.string().datetime().optional() })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one client field is required",
  })
  .transform((input) => ({
    ...input,
    email: input.email === "" ? null : input.email,
    phone: input.phone === "" ? null : input.phone,
    instagramHandle:
      input.instagramHandle === "" ? null : input.instagramHandle?.replace(/^@/, ""),
    preferences: input.preferences === "" ? null : input.preferences,
    notes: input.notes === "" ? null : input.notes,
  }));

export const clientIdParam = z.string().uuid("Client ID is invalid");

export type CreateClientInput = z.infer<typeof createClientInput>;
export type UpdateClientInput = z.infer<typeof updateClientInput>;
