import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { activityEvents, appUsers, inventoryLots, stockMovements, locations } from "../../../src/server/db/schema";
import { uuidParam, updateInventoryLotInput } from "../../../src/server/inventory/input";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, HttpError, json, readJson } from "../../_shared/http";

function getLotId(params: Record<string, string | string[] | undefined>) {
  const value = params.lotId;
  return uuidParam.parse(Array.isArray(value) ? value[0] : value);
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);
    const lotId = getLotId(params);

    const [record] = await db
      .select()
      .from(inventoryLots)
      .where(and(eq(inventoryLots.id, lotId), isNull(inventoryLots.archivedAt)))
      .limit(1);
    if (!record) throw new HttpError(404, "Inventory lot not found.", "lot_not_found");

    const movements = await db
      .select({
        id: stockMovements.id,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        reason: stockMovements.reason,
        occurredAt: stockMovements.occurredAt,
        fromLocationName: sql<string | null>`fl.name`,
        toLocationName: sql<string | null>`tl.name`,
        createdByName: appUsers.displayName,
      })
      .from(stockMovements)
      .innerJoin(appUsers, eq(stockMovements.createdBy, appUsers.id))
      .leftJoin(sql`${locations} as fl`, sql`fl.id = ${stockMovements.fromLocationId}`)
      .leftJoin(sql`${locations} as tl`, sql`tl.id = ${stockMovements.toLocationId}`)
      .where(eq(stockMovements.inventoryLotId, lotId))
      .orderBy(asc(stockMovements.occurredAt));

    const adds = new Set(["receipt", "return", "release", "adjustment_increase"]);
    const subtracts = new Set(["consume", "sale", "damage", "loss", "reserve", "adjustment_decrease"]);
    // Derived purely from movements — the initial receipt movement already
    // accounts for initialQuantity, so do not seed the balance with it.
    // `transfer` and legacy directionless `adjustment` are intentionally neutral.
    let balance = 0;
    for (const m of movements) {
      const qty = parseFloat(m.quantity);
      if (adds.has(m.type)) balance += qty;
      else if (subtracts.has(m.type)) balance -= qty;
    }

    const activityRows = await db
      .select()
      .from(activityEvents)
      .innerJoin(appUsers, eq(activityEvents.actorId, appUsers.id))
      .where(and(eq(activityEvents.entityType, "inventory_lot"), eq(activityEvents.entityId, lotId)))
      .orderBy(asc(activityEvents.createdAt));

    const activity = activityRows.map(r => ({
      id: r.activity_events.id,
      action: r.activity_events.action,
      summary: r.activity_events.summary,
      createdAt: r.activity_events.createdAt,
      actorName: r.app_users?.displayName ?? null,
    }));

    return json({
      data: {
        lot: { ...record, onHandQuantity: String(balance) },
        movements,
        activity,
      },
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
    const lotId = getLotId(params);
    const input = updateInventoryLotInput.parse(await readJson(request));

    const [before] = await db
      .select()
      .from(inventoryLots)
      .where(and(eq(inventoryLots.id, lotId), isNull(inventoryLots.archivedAt)))
      .limit(1);
    if (!before) throw new HttpError(404, "Inventory lot not found.", "lot_not_found");

    const [updatedRows] = await db.batch([
      db.update(inventoryLots).set({ ...input, updatedAt: new Date() }).where(eq(inventoryLots.id, lotId)).returning(),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "inventory_lot.updated",
        entityType: "inventory_lot",
        entityId: lotId,
        summary: `Updated inventory lot ${before.code}`,
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
    const lotId = getLotId(params);

    const [before] = await db
      .select()
      .from(inventoryLots)
      .where(and(eq(inventoryLots.id, lotId), isNull(inventoryLots.archivedAt)))
      .limit(1);
    if (!before) throw new HttpError(404, "Inventory lot not found.", "lot_not_found");

    const archivedAt = new Date();
    await db.batch([
      db.update(inventoryLots).set({ archivedAt, updatedAt: archivedAt }).where(eq(inventoryLots.id, lotId)),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "inventory_lot.archived",
        entityType: "inventory_lot",
        entityId: lotId,
        summary: `Archived inventory lot ${before.code}`,
        before,
        requestId,
      }),
    ]);

    return json({ data: { id: lotId, archivedAt }, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
