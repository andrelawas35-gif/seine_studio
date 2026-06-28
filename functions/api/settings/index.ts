import { eq } from "drizzle-orm";
import { activityEvents, settings } from "../../../src/server/db/schema";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, HttpError, json, readJson } from "../../_shared/http";
import { z } from "zod";

const updateSettingInput = z.object({
  value: z.string().trim().min(1, "Value is required").max(500),
});

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);

    const records = await db.select().from(settings).orderBy(settings.key);
    return json({ data: records, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);

    const url = new URL(request.url);
    const key = url.searchParams.get("key");
    if (!key) throw new HttpError(400, "The setting key is required (e.g. ?key=default_markup_percent).", "missing_key");

    const input = updateSettingInput.parse(await readJson(request));
    const [existing] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    if (!existing) throw new HttpError(404, `Setting "${key}" not found.`, "not_found");

    const before = { key: existing.key, value: existing.value };
    const [updated] = await db
      .update(settings)
      .set({ value: input.value, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(settings.key, key))
      .returning();

    await db.insert(activityEvents).values({
      actorId: user.id,
      action: "setting_updated",
      entityType: "setting",
      entityId: existing.id,
      summary: `Updated ${key} from "${existing.value}" to "${input.value}"`,
      before,
      after: { key: existing.key, value: input.value },
      requestId,
    });

    return json({ data: updated, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
