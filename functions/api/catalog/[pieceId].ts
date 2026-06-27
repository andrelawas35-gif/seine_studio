import { and, asc, eq, isNull } from "drizzle-orm";
import { activityEvents, appUsers, catalogPieces } from "../../../src/server/db/schema";
import { uuidParam, updateCatalogPieceInput } from "../../../src/server/inventory/input";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, HttpError, json, readJson } from "../../_shared/http";

function getPieceId(params: Record<string, string | string[] | undefined>) {
  const value = params.pieceId;
  return uuidParam.parse(Array.isArray(value) ? value[0] : value);
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);
    const pieceId = getPieceId(params);

    const [record] = await db
      .select()
      .from(catalogPieces)
      .where(and(eq(catalogPieces.id, pieceId), isNull(catalogPieces.archivedAt)))
      .limit(1);
    if (!record) throw new HttpError(404, "Catalog piece not found.", "piece_not_found");

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
      .where(and(eq(activityEvents.entityType, "catalog_piece"), eq(activityEvents.entityId, pieceId)))
      .orderBy(asc(activityEvents.createdAt));

    return json({ data: { piece: record, activity }, requestId });
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
    const pieceId = getPieceId(params);
    const input = updateCatalogPieceInput.parse(await readJson(request));

    const [before] = await db
      .select()
      .from(catalogPieces)
      .where(and(eq(catalogPieces.id, pieceId), isNull(catalogPieces.archivedAt)))
      .limit(1);
    if (!before) throw new HttpError(404, "Catalog piece not found.", "piece_not_found");

    const [updatedRows] = await db.batch([
      db.update(catalogPieces).set({ ...input, updatedAt: new Date() }).where(eq(catalogPieces.id, pieceId)).returning(),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "catalog_piece.updated",
        entityType: "catalog_piece",
        entityId: pieceId,
        summary: `Updated catalog piece ${input.name ?? before.name}`,
        before,
        after: { ...before, ...input },
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
    const pieceId = getPieceId(params);

    const [before] = await db
      .select()
      .from(catalogPieces)
      .where(and(eq(catalogPieces.id, pieceId), isNull(catalogPieces.archivedAt)))
      .limit(1);
    if (!before) throw new HttpError(404, "Catalog piece not found.", "piece_not_found");

    const archivedAt = new Date();
    await db.batch([
      db.update(catalogPieces).set({ archivedAt, updatedAt: archivedAt }).where(eq(catalogPieces.id, pieceId)),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "catalog_piece.archived",
        entityType: "catalog_piece",
        entityId: pieceId,
        summary: `Archived catalog piece ${before.name}`,
        before,
        requestId,
      }),
    ]);

    return json({ data: { id: pieceId, archivedAt }, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
