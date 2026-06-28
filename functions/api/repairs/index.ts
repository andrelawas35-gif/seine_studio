import { and, desc, eq, sql } from "drizzle-orm";
import {
  activityEvents,
  appUsers,
  clients,
  locations,
  repairEvents,
  repairTickets,
} from "../../../src/server/db/schema";
import { createRepairInput } from "../../../src/server/trust/input";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, json, readJson } from "../../_shared/http";

function generateTicketNumber(): string {
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `SR-${seq}`;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const clientId = url.searchParams.get("clientId");
    const projectId = url.searchParams.get("projectId");
    const search = url.searchParams.get("search");
    const overdue = url.searchParams.get("overdue");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    const conditions = [];
    if (status) conditions.push(eq(repairTickets.status, status as never));
    if (clientId) conditions.push(eq(repairTickets.clientId, clientId));
    if (projectId) conditions.push(eq(repairTickets.projectId, projectId));
    if (search) {
      conditions.push(
        sql`(${repairTickets.ticketNumber} ilike ${`%${search}%`} or ${repairTickets.pieceDescription} ilike ${`%${search}%`})`,
      );
    }
    if (overdue === "true") {
      conditions.push(
        sql`${repairTickets.status} not in ('released','cancelled') and ${repairTickets.promisedDate} < now()`,
      );
    }
    const where = and(...conditions);

    const [rows, [{ count }]] = await db.batch([
      db
        .select()
        .from(repairTickets)
        .leftJoin(clients, eq(repairTickets.clientId, clients.id))
        .leftJoin(locations, eq(repairTickets.currentLocationId, locations.id))
        .where(where)
        .orderBy(desc(repairTickets.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(repairTickets).where(where),
    ]);

    const records = rows.map((r) => ({
      id: r.repair_tickets.id,
      ticketNumber: r.repair_tickets.ticketNumber,
      clientId: r.repair_tickets.clientId,
      clientName: r.clients?.name ?? null,
      pieceDescription: r.repair_tickets.pieceDescription,
      requestedWork: r.repair_tickets.requestedWork,
      status: r.repair_tickets.status,
      estimateCents: r.repair_tickets.estimateCents,
      depositCents: r.repair_tickets.depositCents,
      promisedDate: r.repair_tickets.promisedDate,
      currentLocationId: r.repair_tickets.currentLocationId,
      currentLocationName: r.locations?.name ?? null,
      createdAt: r.repair_tickets.createdAt,
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
    const input = createRepairInput.parse(await readJson(request));

    const ticketId = crypto.randomUUID();
    const activityId = crypto.randomUUID();
    const eventId = crypto.randomUUID();

    let ticketNumber = generateTicketNumber();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db
        .select({ id: repairTickets.id })
        .from(repairTickets)
        .where(eq(repairTickets.ticketNumber, ticketNumber))
        .limit(1);
      if (existing.length === 0) break;
      ticketNumber = generateTicketNumber();
      attempts++;
    }

    const [createdRows] = await db.batch([
      db
        .insert(repairTickets)
        .values({
          id: ticketId,
          ticketNumber,
          clientId: input.clientId,
          catalogPieceId: input.catalogPieceId || undefined,
          projectId: input.projectId || undefined,
          pieceDescription: input.pieceDescription,
          identifyingMarks: input.identifyingMarks,
          photosUrls: input.photosUrls || [],
          receivedCondition: input.receivedCondition,
          includedAccessories: input.includedAccessories,
          requestedWork: input.requestedWork,
          estimateCents: input.estimateCents,
          depositCents: input.depositCents,
          promisedDate: input.promisedDate ? new Date(input.promisedDate) : undefined,
          currentLocationId: input.currentLocationId || undefined,
          notes: input.notes,
          createdBy: user.id,
        })
        .returning(),
      db.insert(repairEvents).values({
        id: eventId,
        repairTicketId: ticketId,
        eventType: "intake",
        summary: `Repair intake: ${input.pieceDescription}`,
        toStatus: "received",
        actorId: user.id,
        notes: input.receivedCondition ? `Condition: ${input.receivedCondition}` : undefined,
      }),
      db.insert(activityEvents).values({
        id: activityId,
        actorId: user.id,
        action: "repair.created",
        entityType: "repair_ticket",
        entityId: ticketId,
        summary: `Created repair ticket ${ticketNumber} for "${input.pieceDescription}"`,
        after: input as unknown as Record<string, unknown>,
        requestId,
      }),
    ]);

    return json({ data: createdRows[0], requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
