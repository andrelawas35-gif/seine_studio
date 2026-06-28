import { requireUser } from "../_shared/auth";
import { createDatabase } from "../_shared/db";
import { parseServerEnv, type Env } from "../_shared/env";
import { getRequestId, json, HttpError } from "../_shared/http";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const user = await requireUser(request, serverEnv, createDatabase(serverEnv.DATABASE_URL));
    return json({ data: user, requestId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json(
      {
        error: {
          code: error instanceof HttpError ? error.code : "server_error",
          message: `Account verification failed: ${message}`,
        },
        requestId,
      },
      { status: error instanceof HttpError ? error.status : 500 },
    );
  }
};
