import { eq } from "drizzle-orm";
import { activityEvents, expenses, suppliers } from "../../../src/server/db/schema";
import { updateExpenseInput } from "../../../src/server/finance/input";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, json, readJson } from "../../_shared/http";

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);

    const expenseId = (params as Record<string, string>).expenseId;
    const [record, [activity]] = await Promise.all([
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
          updatedAt: expenses.updatedAt,
        })
        .from(expenses)
        .leftJoin(suppliers, eq(expenses.supplierId, suppliers.id))
        .where(eq(expenses.id, expenseId)),
      db.select().from(activityEvents).where(eq(activityEvents.entityId, expenseId)),
    ]);

    if (!record) return json({ error: "Expense not found", requestId }, { status: 404 });
    return json({ data: { ...record, activity }, requestId });
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

    const expenseId = (params as Record<string, string>).expenseId;
    const input = updateExpenseInput.parse(await readJson(request));
    const activityId = crypto.randomUUID();

    const setValues: Record<string, unknown> = { ...input, updatedAt: new Date() };
    if (input.incurredAt) {
      setValues.incurredAt = new Date(input.incurredAt);
    }

    const [updatedRows] = await db.batch([
      db.update(expenses).set(setValues).where(eq(expenses.id, expenseId)).returning(),
      db.insert(activityEvents).values({
        id: activityId,
        actorId: user.id,
        action: "expense.updated",
        entityType: "expense",
        entityId: expenseId,
        summary: "Updated expense",
        after: input,
        requestId,
      }),
    ]);

    return json({ data: updatedRows[0], requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
