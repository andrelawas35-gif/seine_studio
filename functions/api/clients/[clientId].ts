import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  activityEvents,
  appUsers,
  certificates,
  clients,
  invoices,
  payments,
  projects,
  quotes,
  repairTickets,
} from "../../../src/server/db/schema";
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

    const activityRows = await db
      .select()
      .from(activityEvents)
      .innerJoin(appUsers, eq(activityEvents.actorId, appUsers.id))
      .where(and(eq(activityEvents.entityType, "client"), eq(activityEvents.entityId, clientId)))
      .orderBy(asc(activityEvents.createdAt));

    const activity = activityRows.map(r => ({
      id: r.activity_events.id,
      action: r.activity_events.action,
      summary: r.activity_events.summary,
      createdAt: r.activity_events.createdAt,
      actorName: r.app_users?.displayName ?? null,
    }));

    // Derived financials: lifetime spend = sum of payments on client's invoices
    const clientInvoices = await db
      .select({ id: invoices.id, totalCents: invoices.totalCents, paidCents: invoices.paidCents })
      .from(invoices)
      .where(eq(invoices.clientId, clientId));

    let lifetimeSpend = 0;
    const invoiceIds = clientInvoices.map(i => i.id);
    if (invoiceIds.length > 0) {
      const paymentRows = await db
        .select({ amountCents: payments.amountCents })
        .from(payments)
        .where(inArray(payments.invoiceId, invoiceIds));
      lifetimeSpend = paymentRows.reduce((sum, p) => sum + (p.amountCents ?? 0), 0);
    }
    const balanceDue = clientInvoices.reduce((sum, i) => sum + ((i.totalCents ?? 0) - (i.paidCents ?? 0)), 0);
    const finance = { lifetimeSpend, balanceDue };

    // Related entities for Client 360
    const [relatedProjects, relatedQuotes, relatedInvoices, relatedRepairs, relatedCertificates] = await Promise.all([
      db
        .select({
          id: projects.id,
          projectNumber: projects.projectNumber,
          title: projects.title,
          stage: projects.stage,
          targetDate: projects.targetDate,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .where(and(eq(projects.clientId, clientId), isNull(projects.archivedAt)))
        .orderBy(desc(projects.createdAt))
        .limit(20),
      db
        .select({
          id: quotes.id,
          quoteNumber: quotes.quoteNumber,
          status: quotes.status,
          createdAt: quotes.createdAt,
        })
        .from(quotes)
        .where(eq(quotes.clientId, clientId))
        .orderBy(desc(quotes.createdAt))
        .limit(20),
      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          totalCents: invoices.totalCents,
          paidCents: invoices.paidCents,
          status: invoices.status,
          issuedAt: invoices.issuedAt,
        })
        .from(invoices)
        .where(eq(invoices.clientId, clientId))
        .orderBy(desc(invoices.createdAt))
        .limit(20),
      db
        .select({
          id: repairTickets.id,
          ticketNumber: repairTickets.ticketNumber,
          pieceDescription: repairTickets.pieceDescription,
          status: repairTickets.status,
          createdAt: repairTickets.createdAt,
        })
        .from(repairTickets)
        .where(eq(repairTickets.clientId, clientId))
        .orderBy(desc(repairTickets.createdAt))
        .limit(20),
      db
        .select({
          id: certificates.id,
          certificateNumber: certificates.certificateNumber,
          pieceName: certificates.pieceName,
          status: certificates.status,
          createdAt: certificates.createdAt,
        })
        .from(certificates)
        .where(eq(certificates.clientId, clientId))
        .orderBy(desc(certificates.createdAt))
        .limit(20),
    ]);

    const related = {
      projects: relatedProjects,
      quotes: relatedQuotes,
      invoices: relatedInvoices,
      repairs: relatedRepairs,
      certificates: relatedCertificates,
    };

    return json({ data: { client: record, activity, finance, related }, requestId });
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
