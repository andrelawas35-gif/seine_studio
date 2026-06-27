import { and, asc, ilike, isNull, or, sql } from "drizzle-orm";
import { activityEvents, clients } from "../../../src/server/db/schema";
import { clientListQuery, createClientInput } from "../../../src/server/clients/input";
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

    const url = new URL(request.url);
    const query = clientListQuery.parse(Object.fromEntries(url.searchParams));
    const search = query.q ? or(ilike(clients.name, `%${query.q}%`), ilike(clients.email, `%${query.q}%`)) : undefined;
    const where = and(isNull(clients.archivedAt), search);

    const [records, [{ count }]] = await db.batch([
      db.select().from(clients).where(where).orderBy(asc(clients.name)).limit(query.limit).offset(query.offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(clients)
        .where(where),
    ]);

    return json({ data: records, pagination: { ...query, total: count }, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);
    const input = createClientInput.parse(await readJson(request));
    const clientId = crypto.randomUUID();
    const activityId = crypto.randomUUID();

    const [createdRows] = await db.batch([
      db
        .insert(clients)
        .values({ id: clientId, ...input, createdBy: user.id })
        .returning(),
      db.insert(activityEvents).values({
        id: activityId,
        actorId: user.id,
        action: "client.created",
        entityType: "client",
        entityId: clientId,
        summary: `Created client ${input.name}`,
        after: input,
        requestId,
      }),
    ]);

    return json({ data: createdRows[0], requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
