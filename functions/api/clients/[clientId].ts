import { and, asc, eq, isNull } from "drizzle-orm";
import { activityEvents, appUsers, clients } from "../../../src/server/db/schema";
import { clientIdParam, updateClientInput } from "../../../src/server/clients/input";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, HttpError, json, readJson } from "../../_shared/http";

function getClientId(params: Record<string, string | string[] | undefined>) {
  const value = params.clientId;
  return clientIdParam.parse(Array.isArray(value) ? value[0] : value);
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);
    const clientId = getClientId(params);

    const [record] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), isNull(clients.archivedAt)))
      .limit(1);
    if (!record) throw new HttpError(404, "Client not found.", "client_not_found");

    const activity = await db
      .select({
        id: activityEvents.id,
        action: activityEvents.action,
        summary: activityEvents.summary,
        createdAt: activityEvents.createdAt,
        actorName: appUsers.displayName,
      })
      .from(activityEvents)
      .innerJoin(appUsers, eq(activityEvents.actorId, appUsers.id))
      .where(and(eq(activityEvents.entityType, "client"), eq(activityEvents.entityId, clientId)))
      .orderBy(asc(activityEvents.createdAt));

    return json({ data: { client: record, activity }, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);
    const clientId = getClientId(params);
    const input = updateClientInput.parse(await readJson(request));
    const [before] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), isNull(clients.archivedAt)))
      .limit(1);
    if (!before) throw new HttpError(404, "Client not found.", "client_not_found");
    const { expectedUpdatedAt, ...updates } = input;
    if (expectedUpdatedAt && before.updatedAt.toISOString() !== expectedUpdatedAt) {
      throw new HttpError(409, "This client changed on another device. Review it before trying again.", "client_conflict");
    }

    const [updatedRows] = await db.batch([
      db
        .update(clients)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(clients.id, clientId))
        .returning(),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "client.updated",
        entityType: "client",
        entityId: clientId,
        summary: `Updated client ${updates.name ?? before.name}`,
        before,
        after: { ...before, ...updates },
        requestId,
      }),
    ]);

    return json({ data: updatedRows[0], requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);
    const clientId = getClientId(params);
    const [before] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), isNull(clients.archivedAt)))
      .limit(1);
    if (!before) throw new HttpError(404, "Client not found.", "client_not_found");

    const archivedAt = new Date();
    await db.batch([
      db.update(clients).set({ archivedAt, updatedAt: archivedAt }).where(eq(clients.id, clientId)),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "client.archived",
        entityType: "client",
        entityId: clientId,
        summary: `Archived client ${before.name}`,
        before,
        after: { ...before, archivedAt: archivedAt.toISOString() },
        requestId,
      }),
    ]);

    return json({ data: { id: clientId, archivedAt }, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
