import { asc, eq, inArray, sql } from "drizzle-orm";
import {
  catalogPieces,
  eventBudgetLines,
  eventInventoryAllocations,
  eventPriceList,
  events,
  eventTasks,
  inventoryLots,
  locations,
  stockMovements,
} from "../../../src/server/db/schema";
import { uuidParam } from "../../../src/server/inventory/input";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, HttpError, json } from "../../_shared/http";

const ADD_TYPES = new Set(["receipt", "return", "release", "adjustment_increase"]);
const SUBTRACT_TYPES = new Set(["reserve", "consume", "sale", "damage", "loss", "adjustment_decrease"]);

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);
    const eventId = uuidParam.parse(params.eventId);
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) throw new HttpError(404, "Event not found.", "event_not_found");

    const [tasks, budgetLines, allocations, lots, priceList] = await Promise.all([
      db.select().from(eventTasks).where(eq(eventTasks.eventId, eventId)).orderBy(asc(eventTasks.sortOrder)),
      db
        .select()
        .from(eventBudgetLines)
        .where(eq(eventBudgetLines.eventId, eventId))
        .orderBy(asc(eventBudgetLines.createdAt)),
      db
        .select({
          id: eventInventoryAllocations.id,
          inventoryLotId: eventInventoryAllocations.inventoryLotId,
          lotCode: inventoryLots.code,
          description: inventoryLots.description,
          unit: inventoryLots.unit,
          sourceLocationId: eventInventoryAllocations.sourceLocationId,
          sourceLocationName: locations.name,
          plannedQuantity: eventInventoryAllocations.plannedQuantity,
          openingQuantity: eventInventoryAllocations.openingQuantity,
          closingQuantity: eventInventoryAllocations.closingQuantity,
          status: eventInventoryAllocations.status,
          notes: eventInventoryAllocations.notes,
        })
        .from(eventInventoryAllocations)
        .innerJoin(inventoryLots, eq(eventInventoryAllocations.inventoryLotId, inventoryLots.id))
        .innerJoin(locations, eq(eventInventoryAllocations.sourceLocationId, locations.id))
        .where(eq(eventInventoryAllocations.eventId, eventId))
        .orderBy(asc(inventoryLots.description)),
      db
        .select({
          id: inventoryLots.id,
          code: inventoryLots.code,
          description: inventoryLots.description,
          unit: inventoryLots.unit,
          retailPriceCents: catalogPieces.retailPriceCents,
          costCents: inventoryLots.unitCostCents,
        })
        .from(inventoryLots)
        .leftJoin(catalogPieces, eq(inventoryLots.catalogPieceId, catalogPieces.id))
        .where(eq(inventoryLots.kind, "finished_piece"))
        .orderBy(asc(inventoryLots.description)),
      db
        .select({
          id: eventPriceList.id,
          eventId: eventPriceList.eventId,
          catalogPieceId: eventPriceList.catalogPieceId,
          pieceName: catalogPieces.name,
          pieceSku: catalogPieces.sku,
          priceCents: eventPriceList.priceCents,
          notes: eventPriceList.notes,
        })
        .from(eventPriceList)
        .innerJoin(catalogPieces, eq(eventPriceList.catalogPieceId, catalogPieces.id))
        .where(eq(eventPriceList.eventId, eventId))
        .orderBy(asc(catalogPieces.name)),
    ]);

    const balances = new Map<string, number>();
    if (lots.length) {
      const sums = await db
        .select({
          inventoryLotId: stockMovements.inventoryLotId,
          type: stockMovements.type,
          total: sql<string>`sum(${stockMovements.quantity})`,
        })
        .from(stockMovements)
        .where(
          inArray(
            stockMovements.inventoryLotId,
            lots.map((lot) => lot.id),
          ),
        )
        .groupBy(stockMovements.inventoryLotId, stockMovements.type);
      for (const row of sums) {
        const sign = ADD_TYPES.has(row.type) ? 1 : SUBTRACT_TYPES.has(row.type) ? -1 : 0;
        balances.set(row.inventoryLotId, (balances.get(row.inventoryLotId) ?? 0) + sign * Number(row.total));
      }
    }

    const stockSuggestions = lots
      .map((lot) => ({ ...lot, availableQuantity: String(Math.max(0, balances.get(lot.id) ?? 0)) }))
      .filter((lot) => Number(lot.availableQuantity) > 0);

    return json({ data: { event, tasks, budgetLines, allocations, stockSuggestions, eventPriceList: priceList }, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
