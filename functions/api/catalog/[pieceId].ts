import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  activityEvents,
  appUsers,
  catalogPieces,
  certificates,
  clients,
  inventoryLots,
  projects,
  repairTickets,
  stockMovements,
} from "../../../src/server/db/schema";
import { uuidParam, updateCatalogPieceInput } from "../../../src/server/inventory/input";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, HttpError, json, readJson } from "../../_shared/http";

function getPieceId(params: Record<string, string | string[] | undefined>) {
  const value = params.pieceId;
  return uuidParam.parse(Array.isArray(value) ? value[0] : value);
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);
    const pieceId = getPieceId(params);

    const [record] = await db
      .select()
      .from(catalogPieces)
      .where(and(eq(catalogPieces.id, pieceId), isNull(catalogPieces.archivedAt)))
      .limit(1);
    if (!record) throw new HttpError(404, "Catalog piece not found.", "piece_not_found");

    const [activityRows, linkedProjects, linkedStock, linkedCertificates, linkedRepairs] = await Promise.all([
      db
        .select()
        .from(activityEvents)
        .innerJoin(appUsers, eq(activityEvents.actorId, appUsers.id))
        .where(and(eq(activityEvents.entityType, "catalog_piece"), eq(activityEvents.entityId, pieceId)))
        .orderBy(asc(activityEvents.createdAt)),

      // Projects referencing this piece
      db
        .select()
        .from(projects)
        .innerJoin(clients, eq(projects.clientId, clients.id))
        .where(and(eq(projects.catalogPieceId, pieceId), isNull(projects.archivedAt)))
        .orderBy(asc(projects.createdAt)),

      // Finished-piece stock lots linked to this piece
      db
        .select({
          id: inventoryLots.id,
          code: inventoryLots.code,
          description: inventoryLots.description,
          unitCostCents: inventoryLots.unitCostCents,
        })
        .from(inventoryLots)
        .where(
          and(
            eq(inventoryLots.catalogPieceId, pieceId),
            eq(inventoryLots.kind, "finished_piece"),
            isNull(inventoryLots.archivedAt),
          ),
        )
        .orderBy(asc(inventoryLots.code)),

      // Certificates issued for this piece
      db
        .select()
        .from(certificates)
        .leftJoin(clients, eq(certificates.clientId, clients.id))
        .where(eq(certificates.catalogPieceId, pieceId))
        .orderBy(asc(certificates.createdAt)),

      // Repairs referencing this piece
      db
        .select()
        .from(repairTickets)
        .leftJoin(clients, eq(repairTickets.clientId, clients.id))
        .where(eq(repairTickets.catalogPieceId, pieceId))
        .orderBy(asc(repairTickets.createdAt)),

      // Units sold: computed after Promise.all (needs linkedStock lot IDs)
      Promise.resolve([{ totalSold: 0 }]),
    ]);

    const activity = activityRows.map(r => ({
      id: r.activity_events.id,
      action: r.activity_events.action,
      summary: r.activity_events.summary,
      createdAt: r.activity_events.createdAt,
      actorName: r.app_users?.displayName ?? null,
    }));

    // Units sold: count of sale stock movements on lots linked to this piece
    let totalSold = 0;
    const lotIds = linkedStock.map(l => l.id);
    if (lotIds.length > 0) {
      const [soldResult] = await db
        .select({
          totalSold: sql<number>`coalesce(sum(${stockMovements.quantity}), 0)::int`,
        })
        .from(stockMovements)
        .where(
          and(
            inArray(stockMovements.inventoryLotId, lotIds),
            eq(stockMovements.type, "sale"),
          ),
        );
      totalSold = soldResult?.totalSold ?? 0;
    }

    const usage = {
      projects: linkedProjects.map(r => ({
        id: r.projects.id,
        projectNumber: r.projects.projectNumber,
        title: r.projects.title,
        stage: r.projects.stage,
        clientName: r.clients?.name ?? null,
        targetDate: r.projects.targetDate,
      })),
      stockLots: linkedStock,
      certificates: linkedCertificates.map(r => ({
        id: r.certificates.id,
        certificateNumber: r.certificates.certificateNumber,
        status: r.certificates.status,
        pieceName: r.certificates.pieceName,
        clientName: r.clients?.name ?? null,
        issuedAt: r.certificates.createdAt,
      })),
      repairs: linkedRepairs.map(r => ({
        id: r.repair_tickets.id,
        ticketNumber: r.repair_tickets.ticketNumber,
        pieceDescription: r.repair_tickets.pieceDescription,
        status: r.repair_tickets.status,
        clientName: r.clients?.name ?? null,
        createdAt: r.repair_tickets.createdAt,
      })),
      totalSold,
    };

    return json({ data: { piece: record, activity, usage }, requestId });
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
    const pieceId = getPieceId(params);
    const input = updateCatalogPieceInput.parse(await readJson(request));

    const [before] = await db
      .select()
      .from(catalogPieces)
      .where(and(eq(catalogPieces.id, pieceId), isNull(catalogPieces.archivedAt)))
      .limit(1);
    if (!before) throw new HttpError(404, "Catalog piece not found.", "piece_not_found");

    const [updatedRows] = await db.batch([
      db.update(catalogPieces).set({ ...input, updatedAt: new Date() }).where(eq(catalogPieces.id, pieceId)).returning(),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "catalog_piece.updated",
        entityType: "catalog_piece",
        entityId: pieceId,
        summary: `Updated catalog piece ${input.name ?? before.name}`,
        before,
        after: { ...before, ...input },
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
    const pieceId = getPieceId(params);

    const [before] = await db
      .select()
      .from(catalogPieces)
      .where(and(eq(catalogPieces.id, pieceId), isNull(catalogPieces.archivedAt)))
      .limit(1);
    if (!before) throw new HttpError(404, "Catalog piece not found.", "piece_not_found");

    const archivedAt = new Date();
    await db.batch([
      db.update(catalogPieces).set({ archivedAt, updatedAt: archivedAt }).where(eq(catalogPieces.id, pieceId)),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "catalog_piece.archived",
        entityType: "catalog_piece",
        entityId: pieceId,
        summary: `Archived catalog piece ${before.name}`,
        before,
        requestId,
      }),
    ]);

    return json({ data: { id: pieceId, archivedAt }, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
