import { and, asc, ilike, isNull, or, sql } from "drizzle-orm";
import { activityEvents, catalogPieces } from "../../../src/server/db/schema";
import { createCatalogPieceInput, listQuery } from "../../../src/server/inventory/input";
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
    const query = listQuery.parse(Object.fromEntries(url.searchParams));
    const search = query.q
      ? or(ilike(catalogPieces.name, `%${query.q}%`), ilike(catalogPieces.sku, `%${query.q}%`))
      : undefined;
    const where = and(isNull(catalogPieces.archivedAt), search);

    const [records, [{ count }]] = await db.batch([
      db.select().from(catalogPieces).where(where).orderBy(asc(catalogPieces.name)).limit(query.limit).offset(query.offset),
      db.select({ count: sql<number>`count(*)::int` }).from(catalogPieces).where(where),
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
    const input = createCatalogPieceInput.parse(await readJson(request));
    const pieceId = crypto.randomUUID();

    const [createdRows] = await db.batch([
      db.insert(catalogPieces).values({ id: pieceId, ...input }).returning(),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "catalog_piece.created",
        entityType: "catalog_piece",
        entityId: pieceId,
        summary: `Added ${input.name} (${input.sku}) to catalog`,
        after: input,
        requestId,
      }),
    ]);

    return json({ data: createdRows[0], requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
