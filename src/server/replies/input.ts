import { z } from "zod";

export const createReplyTemplateInput = z.object({
  name: z.string().trim().min(1, "Template name is required").max(200),
  category: z.string().trim().min(1, "Category is required").max(80),
});

export const createReplyTemplateVersionInput = z.object({
  body: z.string().trim().min(1, "Body is required").max(10_000),
  variables: z.array(z.string().max(80)).max(50).default([]),
});

export type CreateReplyTemplateInput = z.infer<typeof createReplyTemplateInput>;
export type CreateReplyTemplateVersionInput = z.infer<typeof createReplyTemplateVersionInput>;
