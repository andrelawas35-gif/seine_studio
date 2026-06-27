import { eq } from "drizzle-orm";
import { locations } from "../../../src/server/db/schema";
import { uuidParam, updateLocationInput } from "../../../src/server/inventory/input";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, HttpError, json, readJson } from "../../_shared/http";

function getLocationId(params: Record<string, string | string[] | undefined>) {
  const value = params.locationId;
  return uuidParam.parse(Array.isArray(value) ? value[0] : value);
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);
    const locationId = getLocationId(params);
    const input = updateLocationInput.parse(await readJson(request));

    const [updated] = await db
      .update(locations)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(locations.id, locationId))
      .returning();
    if (!updated) throw new HttpError(404, "Location not found.", "location_not_found");

    return json({ data: updated, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
