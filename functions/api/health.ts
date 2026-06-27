import type { Env } from "../_shared/env";
import { json } from "../_shared/http";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const configured = Boolean(env.DATABASE_URL && env.NEON_AUTH_URL && env.OWNER_EMAIL && env.DEVELOPER_EMAIL);
  return json(
    { status: configured ? "ready" : "configuration_required", service: "seine-studio-api" },
    { status: configured ? 200 : 503 },
  );
};
