import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { activityEvents, clients, invoices } from "../../../src/server/db/schema";
import { createInvoiceInput } from "../../../src/server/finance/input";
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
    const overdue = url.searchParams.get("overdue") === "true";
    // Invoices now link directly to events via invoices.event_id (Wave 0 M0.4).
    // Filter by eventId uses the direct column, not the through-project join.
    const eventId = url.searchParams.get("eventId");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    const conditions = [];
    if (search) conditions.push(or(sql`${invoices.invoiceNumber}::text ilike ${`%${search}%`}`));
    if (status) conditions.push(eq(invoices.status, status as never));
    if (overdue) {
      conditions.push(and(eq(invoices.status, "sent" as never), sql`${invoices.dueDate} < now()`));
    }
    if (eventId) conditions.push(eq(invoices.eventId, eventId));
    const where = and(...conditions);

    const [rows, [{ count }]] = await db.batch([
      db
        .select()
        .from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .where(where)
        .orderBy(desc(invoices.issuedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(invoices)
        .where(where),
    ]);

    const records = rows.map((r) => ({
      id: r.invoices.id,
      invoiceNumber: r.invoices.invoiceNumber,
      clientId: r.invoices.clientId,
      clientName: r.clients?.name ?? null,
      projectId: r.invoices.projectId,
      eventId: r.invoices.eventId,
      status: r.invoices.status,
      totalCents: r.invoices.totalCents,
      paidCents: r.invoices.paidCents,
      dueDate: r.invoices.dueDate,
      issuedAt: r.invoices.issuedAt,
    }));

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
    const input = createInvoiceInput.parse(await readJson(request));

    const invoiceId = crypto.randomUUID();
    const activityId = crypto.randomUUID();

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(invoices);
    const invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`;

    const [createdRows] = await db.batch([
      db
        .insert(invoices)
        .values({
          id: invoiceId,
          invoiceNumber,
          clientId: input.clientId,
          projectId: input.projectId,
          quoteId: input.quoteId,
          eventId: input.eventId,
          currency: input.currency,
          subtotalCents: input.subtotalCents,
          discountCents: input.discountCents,
          taxCents: input.taxCents,
          totalCents: input.totalCents,
          depositPercent: input.depositPercent,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          lineItemsSnapshot: input.lineItemsSnapshot,
          notes: input.notes,
          createdBy: user.id,
        })
        .returning(),
      db.insert(activityEvents).values({
        id: activityId,
        actorId: user.id,
        action: "invoice.created",
        entityType: "invoice",
        entityId: invoiceId,
        summary: `Created invoice ${invoiceNumber}`,
        after: input,
        requestId,
      }),
    ]);

    return json({ data: createdRows[0], requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
