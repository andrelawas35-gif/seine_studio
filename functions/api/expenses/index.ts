import { and, desc, eq, sql } from "drizzle-orm";
import { activityEvents, expenses, suppliers } from "../../../src/server/db/schema";
import { createExpenseInput } from "../../../src/server/finance/input";
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
    const category = url.searchParams.get("category");
    const projectId = url.searchParams.get("projectId");
    const isCogs = url.searchParams.get("isCogs");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    const conditions = [];
    if (category) conditions.push(eq(expenses.category, category as never));
    if (projectId) conditions.push(eq(expenses.projectId, projectId));
    if (isCogs !== null) conditions.push(eq(expenses.isCogs, isCogs === "true"));
    const where = and(...conditions);

    const [records, [{ count }]] = await db.batch([
      db
        .select({
          id: expenses.id,
          supplierId: expenses.supplierId,
          supplierName: suppliers.name,
          projectId: expenses.projectId,
          eventId: expenses.eventId,
          category: expenses.category,
          description: expenses.description,
          amountCents: expenses.amountCents,
          method: expenses.method,
          receiptUrl: expenses.receiptUrl,
          incurredAt: expenses.incurredAt,
          isCogs: expenses.isCogs,
          notes: expenses.notes,
          createdAt: expenses.createdAt,
        })
        .from(expenses)
        .leftJoin(suppliers, eq(expenses.supplierId, suppliers.id))
        .where(where)
        .orderBy(desc(expenses.incurredAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(expenses).where(where),
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
    const input = createExpenseInput.parse(await readJson(request));

    const expenseId = crypto.randomUUID();
    const activityId = crypto.randomUUID();

    const [createdRows] = await db.batch([
      db
        .insert(expenses)
        .values({
          id: expenseId,
          supplierId: input.supplierId,
          projectId: input.projectId,
          eventId: input.eventId,
          category: input.category,
          description: input.description,
          amountCents: input.amountCents,
          method: input.method,
          receiptUrl: input.receiptUrl || undefined,
          incurredAt: new Date(input.incurredAt),
          isCogs: input.isCogs,
          notes: input.notes,
          createdBy: user.id,
        })
        .returning(),
      db.insert(activityEvents).values({
        id: activityId,
        actorId: user.id,
        action: "expense.created",
        entityType: "expense",
        entityId: expenseId,
        summary: `Logged expense: ${input.description} (${(input.amountCents / 100).toFixed(2)})`,
        after: input,
        requestId,
      }),
    ]);

    return json({ data: createdRows[0], requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
