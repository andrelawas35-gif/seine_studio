import { eq, sql } from "drizzle-orm";
import {
  activityEvents,
  appUsers,
  catalogPieces,
  clients,
  locations,
  repairEvents,
  repairTickets,
} from "../../../src/server/db/schema";
import { updateRepairInput, transitionRepairInput } from "../../../src/server/trust/input";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, json, readJson } from "../../_shared/http";

const STATUS_LABELS: Record<string, string> = {
  received: "Received",
  assessed: "Assessed",
  awaiting_approval: "Awaiting Approval",
  in_service: "In Service",
  waiting_for_parts: "Waiting for Parts",
  quality_check: "Quality Check",
  ready: "Ready",
  released: "Released",
  cancelled: "Cancelled",
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);
    const ticketId = params.ticketId as string;

    const [ticket] = await db
      .select({
        id: repairTickets.id,
        ticketNumber: repairTickets.ticketNumber,
        clientId: repairTickets.clientId,
        clientName: clients.name,
        catalogPieceId: repairTickets.catalogPieceId,
        pieceSku: catalogPieces.sku,
        pieceDescription: repairTickets.pieceDescription,
        identifyingMarks: repairTickets.identifyingMarks,
        photosUrls: repairTickets.photosUrls,
        receivedCondition: repairTickets.receivedCondition,
        includedAccessories: repairTickets.includedAccessories,
        requestedWork: repairTickets.requestedWork,
        estimateCents: repairTickets.estimateCents,
        depositCents: repairTickets.depositCents,
        promisedDate: repairTickets.promisedDate,
        status: repairTickets.status,
        currentLocationId: repairTickets.currentLocationId,
        currentLocationName: locations.name,
        releaseAcknowledgment: repairTickets.releaseAcknowledgment,
        notes: repairTickets.notes,
        createdBy: repairTickets.createdBy,
        createdAt: repairTickets.createdAt,
        updatedAt: repairTickets.updatedAt,
      })
      .from(repairTickets)
      .leftJoin(clients, eq(repairTickets.clientId, clients.id))
      .leftJoin(catalogPieces, eq(repairTickets.catalogPieceId, catalogPieces.id))
      .leftJoin(locations, eq(repairTickets.currentLocationId, locations.id))
      .where(eq(repairTickets.id, ticketId));

    if (!ticket) {
      return json({ error: { code: "not_found", message: "Repair ticket not found" }, requestId }, { status: 404 });
    }

    const events = await db
      .select({
        id: repairEvents.id,
        eventType: repairEvents.eventType,
        summary: repairEvents.summary,
        fromStatus: repairEvents.fromStatus,
        toStatus: repairEvents.toStatus,
        fromLocationId: repairEvents.fromLocationId,
        fromLocationName: sql<string | null>`from_loc.name`,
        toLocationId: repairEvents.toLocationId,
        toLocationName: sql<string | null>`to_loc.name`,
        actorId: repairEvents.actorId,
        displayName: appUsers.displayName,
        notes: repairEvents.notes,
        occurredAt: repairEvents.occurredAt,
      })
      .from(repairEvents)
      .leftJoin(appUsers, eq(repairEvents.actorId, appUsers.id))
      .leftJoin(
        sql`${locations} as from_loc`,
        eq(repairEvents.fromLocationId, sql`from_loc.id`),
      )
      .leftJoin(
        sql`${locations} as to_loc`,
        eq(repairEvents.toLocationId, sql`to_loc.id`),
      )
      .where(eq(repairEvents.repairTicketId, ticketId))
      .orderBy(sql`${repairEvents.occurredAt} desc`);

    const activities = await db
      .select({
        id: activityEvents.id,
        action: activityEvents.action,
        summary: activityEvents.summary,
        displayName: appUsers.displayName,
        createdAt: activityEvents.createdAt,
      })
      .from(activityEvents)
      .leftJoin(appUsers, eq(activityEvents.actorId, appUsers.id))
      .where(sql`${activityEvents.entityType} = 'repair_ticket' and ${activityEvents.entityId} = ${ticketId}`)
      .orderBy(sql`${activityEvents.createdAt} desc`)
      .limit(50);

    return json({ data: { ...ticket, events, activities }, requestId });
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
    const ticketId = params.ticketId as string;

    const [existing] = await db
      .select({ id: repairTickets.id, status: repairTickets.status, currentLocationId: repairTickets.currentLocationId })
      .from(repairTickets)
      .where(eq(repairTickets.id, ticketId));

    if (!existing) {
      return json({ error: { code: "not_found", message: "Repair ticket not found" }, requestId }, { status: 404 });
    }

    const body = (await readJson(request)) as Record<string, unknown>;
    const activityId = crypto.randomUUID();

    // Status transition (custody event)
    if (body.status) {
      const input = transitionRepairInput.parse(body);
      const newStatus = input.status;
      const fromLabel = STATUS_LABELS[existing.status] || existing.status;
      const toLabel = STATUS_LABELS[newStatus] || newStatus;

      const eventId = crypto.randomUUID();
      const updates: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };
      if (input.locationId) updates.currentLocationId = input.locationId;

      const [updated] = await db.batch([
        db.update(repairTickets).set(updates).where(eq(repairTickets.id, ticketId)).returning(),
        db.insert(repairEvents).values({
          id: eventId,
          repairTicketId: ticketId,
          eventType: newStatus === "released" ? "release" : newStatus === "cancelled" ? "cancel" : "status_change",
          summary: `Status: ${fromLabel} → ${toLabel}`,
          fromStatus: existing.status,
          toStatus: newStatus,
          fromLocationId: existing.currentLocationId,
          toLocationId: input.locationId || undefined,
          actorId: user.id,
          notes: input.notes,
        }),
        db.insert(activityEvents).values({
          id: activityId,
          actorId: user.id,
          action: `repair.${newStatus}`,
          entityType: "repair_ticket",
          entityId: ticketId,
          summary: `Repair status: ${fromLabel} → ${toLabel}${input.notes ? ` — ${input.notes}` : ""}`,
          requestId,
        }),
      ]);
      return json({ data: updated[0], requestId });
    }

    // Regular field update
    const input = updateRepairInput.parse(body);
    const [updated] = await db.batch([
      db
        .update(repairTickets)
        .set({
          ...input,
          photosUrls: input.photosUrls || undefined,
          promisedDate: input.promisedDate ? new Date(input.promisedDate) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(repairTickets.id, ticketId))
        .returning(),
      db.insert(activityEvents).values({
        id: activityId,
        actorId: user.id,
        action: "repair.updated",
        entityType: "repair_ticket",
        entityId: ticketId,
        summary: `Updated repair ticket details`,
        after: input as unknown as Record<string, unknown>,
        requestId,
      }),
    ]);

    return json({ data: updated[0], requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
