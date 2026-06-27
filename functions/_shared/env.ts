import { z } from "zod";

export interface Env {
  DATABASE_URL: string;
  NEON_AUTH_URL: string;
  OWNER_EMAIL: string;
  DEVELOPER_EMAIL: string;
}

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  NEON_AUTH_URL: z.string().url(),
  OWNER_EMAIL: z.string().email(),
  DEVELOPER_EMAIL: z.string().email(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(env: Env): ServerEnv {
  const parsed = serverEnvSchema.safeParse(env);

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Server configuration is invalid: ${missing}`);
  }

  return {
    ...parsed.data,
    OWNER_EMAIL: parsed.data.OWNER_EMAIL.toLowerCase(),
    DEVELOPER_EMAIL: parsed.data.DEVELOPER_EMAIL.toLowerCase(),
  };
}
