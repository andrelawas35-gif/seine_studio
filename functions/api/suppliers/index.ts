import { and, asc, ilike, isNull, or, sql } from "drizzle-orm";
import { activityEvents, suppliers } from "../../../src/server/db/schema";
import { createSupplierInput } from "../../../src/server/finance/input";
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
    const search = url.searchParams.get("q") || "";
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    const searchClause = search ? or(ilike(suppliers.name, `%${search}%`)) : undefined;
    const where = and(isNull(suppliers.archivedAt), searchClause);

    const [records, [{ count }]] = await db.batch([
      db.select().from(suppliers).where(where).orderBy(asc(suppliers.name)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(suppliers).where(where),
    ]);

    return json({ data: records, pagination: { limit, offset, total: count }, requestId });
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
    const input = createSupplierInput.parse(await readJson(request));

    const supplierId = crypto.randomUUID();
    const activityId = crypto.randomUUID();

    const [createdRows] = await db.batch([
      db.insert(suppliers).values({ id: supplierId, ...input }).returning(),
      db.insert(activityEvents).values({
        id: activityId,
        actorId: user.id,
        action: "supplier.created",
        entityType: "supplier",
        entityId: supplierId,
        summary: `Created supplier ${input.name}`,
        after: input,
        requestId,
      }),
    ]);

    return json({ data: createdRows[0], requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
