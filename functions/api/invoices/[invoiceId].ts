import { eq, sql } from "drizzle-orm";
import { activityEvents, clients, invoices, payments, projects } from "../../../src/server/db/schema";
import { updateInvoiceStatusInput } from "../../../src/server/finance/input";
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

    const invoiceId = (params as Record<string, string>).invoiceId;
    if (!invoiceId) return json({ error: "Invoice ID is required", requestId }, { status: 400 });

    const [record, paymentRecords, [activity]] = await Promise.all([
      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          clientId: invoices.clientId,
          clientName: clients.name,
          projectId: invoices.projectId,
          projectTitle: projects.title,
          quoteId: invoices.quoteId,
          status: invoices.status,
          currency: invoices.currency,
          subtotalCents: invoices.subtotalCents,
          discountCents: invoices.discountCents,
          taxCents: invoices.taxCents,
          totalCents: invoices.totalCents,
          paidCents: invoices.paidCents,
          depositPercent: invoices.depositPercent,
          dueDate: invoices.dueDate,
          issuedAt: invoices.issuedAt,
          paidAt: invoices.paidAt,
          voidedAt: invoices.voidedAt,
          voidReason: invoices.voidReason,
          lineItemsSnapshot: invoices.lineItemsSnapshot,
          notes: invoices.notes,
          createdAt: invoices.createdAt,
        })
        .from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .leftJoin(projects, eq(invoices.projectId, projects.id))
        .where(eq(invoices.id, invoiceId)),
      db.select().from(payments).where(eq(payments.invoiceId, invoiceId)),
      db.select().from(activityEvents).where(eq(activityEvents.entityId, invoiceId)),
    ]);

    if (!record || record.length === 0) return json({ error: "Invoice not found", requestId }, { status: 404 });

    const invoice = record[0];
    const balanceDueCents = invoice.totalCents - invoice.paidCents;

    return json({
      data: { ...invoice, payments: paymentRecords, balanceDueCents, activity },
      requestId,
    });
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

    const invoiceId = (params as Record<string, string>).invoiceId;
    if (!invoiceId) return json({ error: "Invoice ID is required", requestId }, { status: 400 });

    const input = updateInvoiceStatusInput.parse(await readJson(request));
    const activityId = crypto.randomUUID();
    const now = new Date();

    const updates: Record<string, unknown> = { status: input.status, updatedAt: now };
    if (input.status === "void") {
      updates.voidedAt = now;
      updates.voidReason = input.voidReason;
    }

    const [updatedRows] = await db.batch([
      db.update(invoices).set(updates).where(eq(invoices.id, invoiceId)).returning(),
      db.insert(activityEvents).values({
        id: activityId,
        actorId: user.id,
        action: `invoice.${input.status}`,
        entityType: "invoice",
        entityId: invoiceId,
        summary: `Invoice ${input.status}`,
        after: input,
        requestId,
      }),
    ]);

    return json({ data: updatedRows[0], requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
