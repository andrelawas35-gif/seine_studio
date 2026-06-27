import { eq, sql } from "drizzle-orm";
import { activityEvents, invoices, payments } from "../../../src/server/db/schema";
import { createPaymentInput } from "../../../src/server/finance/input";
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
    const invoiceId = url.searchParams.get("invoiceId");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    const where = invoiceId ? eq(payments.invoiceId, invoiceId) : undefined;

    const [records, [{ count }]] = await db.batch([
      db
        .select()
        .from(payments)
        .where(where)
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(payments).where(where),
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
    const input = createPaymentInput.parse(await readJson(request));

    // Verify invoice exists and is not voided/refunded
    const [invoice] = await db.select({ id: invoices.id, status: invoices.status, totalCents: invoices.totalCents, paidCents: invoices.paidCents }).from(invoices).where(eq(invoices.id, input.invoiceId));
    if (!invoice) return json({ error: "Invoice not found", requestId }, { status: 404 });
    if (invoice.status === "void" || invoice.status === "refunded") {
      return json({ error: "Cannot pay a voided or refunded invoice", requestId }, { status: 409 });
    }

    const paymentId = crypto.randomUUID();
    const activityId = crypto.randomUUID();
    const newPaid = invoice.paidCents + input.amountCents;
    const newStatus = newPaid >= invoice.totalCents ? "paid" : "partially_paid";

    const [createdRows] = await db.batch([
      db
        .insert(payments)
        .values({
          id: paymentId,
          invoiceId: input.invoiceId,
          amountCents: input.amountCents,
          method: input.method,
          externalReference: input.externalReference,
          feesCents: input.feesCents,
          receivedAt: new Date(input.receivedAt),
          notes: input.notes,
          createdBy: user.id,
        })
        .returning(),
      db
        .update(invoices)
        .set({
          paidCents: newPaid,
          status: newStatus as never,
          paidAt: newStatus === "paid" ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, input.invoiceId)),
      db.insert(activityEvents).values({
        id: activityId,
        actorId: user.id,
        action: "payment.received",
        entityType: "payment",
        entityId: paymentId,
        summary: `Received ${(input.amountCents / 100).toFixed(2)} ${input.method}`,
        after: input,
        requestId,
      }),
    ]);

    return json({ data: createdRows[0], requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
