import { asc } from "drizzle-orm";
import { locations } from "../../../src/server/db/schema";
import { createLocationInput } from "../../../src/server/inventory/input";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, json, readJson } from "../../_shared/http";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);

    const records = await db.select().from(locations).orderBy(asc(locations.name));
    return json({ data: records, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);
    const input = createLocationInput.parse(await readJson(request));

    const [created] = await db.insert(locations).values(input).returning();
    return json({ data: created, requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
