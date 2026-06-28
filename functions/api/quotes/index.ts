import { and, desc, eq, or, sql } from "drizzle-orm";
import { activityEvents, clients, quotes } from "../../../src/server/db/schema";
import { createQuoteInput } from "../../../src/server/finance/input";
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
    const status = url.searchParams.get("status");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    const conditions = [];
    if (search) conditions.push(or(sql`${quotes.quoteNumber}::text ilike ${`%${search}%`}`));
    if (status) conditions.push(eq(quotes.status, status as never));
    const where = and(...conditions);

    const [records, [{ count }]] = await db.batch([
      db
        .select({
          id: quotes.id,
          quoteNumber: quotes.quoteNumber,
          clientId: quotes.clientId,
          clientName: clients.name,
          projectId: quotes.projectId,
          status: quotes.status,
          depositPercent: quotes.depositPercent,
          validUntil: quotes.validUntil,
          createdAt: quotes.createdAt,
        })
        .from(quotes)
        .leftJoin(clients, eq(quotes.clientId, clients.id))
        .where(where)
        .orderBy(desc(quotes.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(quotes).where(where),
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
    const input = createQuoteInput.parse(await readJson(request));

    const quoteId = crypto.randomUUID();
    const activityId = crypto.randomUUID();

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(quotes);
    const quoteNumber = `Q-${String(count + 1).padStart(4, "0")}`;

    const [createdRows] = await db.batch([
      db
        .insert(quotes)
        .values({
          id: quoteId,
          quoteNumber,
          clientId: input.clientId,
          projectId: input.projectId,
          pricingVersionId: input.pricingVersionId,
          depositPercent: input.depositPercent,
          terms: input.terms,
          validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
          notes: input.notes,
          createdBy: user.id,
        })
        .returning(),
      db.insert(activityEvents).values({
        id: activityId,
        actorId: user.id,
        action: "quote.created",
        entityType: "quote",
        entityId: quoteId,
        summary: `Created quote ${quoteNumber}`,
        after: input,
        requestId,
      }),
    ]);

    return json({ data: createdRows[0], requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
