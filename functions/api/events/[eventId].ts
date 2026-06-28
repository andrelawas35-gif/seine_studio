import { asc, eq, inArray, sql } from "drizzle-orm";
import {
  catalogPieces,
  clients,
  eventBudgetLines,
  eventInventoryAllocations,
  events,
  eventTasks,
  inventoryLots,
  locations,
  projects,
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

    const [tasks, budgetLines, allocationsRaw, lotsRaw, linkedProjectsRaw] = await Promise.all([
      db.select().from(eventTasks).where(eq(eventTasks.eventId, eventId)).orderBy(asc(eventTasks.sortOrder)),
      db
        .select()
        .from(eventBudgetLines)
        .where(eq(eventBudgetLines.eventId, eventId))
        .orderBy(asc(eventBudgetLines.createdAt)),
      db
        .select()
        .from(eventInventoryAllocations)
        .innerJoin(inventoryLots, eq(eventInventoryAllocations.inventoryLotId, inventoryLots.id))
        .innerJoin(locations, eq(eventInventoryAllocations.sourceLocationId, locations.id))
        .where(eq(eventInventoryAllocations.eventId, eventId))
        .orderBy(asc(inventoryLots.description)),
      db
        .select()
        .from(inventoryLots)
        .leftJoin(catalogPieces, eq(inventoryLots.catalogPieceId, catalogPieces.id))
        .where(eq(inventoryLots.kind, "finished_piece"))
        .orderBy(asc(inventoryLots.description)),

      // Linked projects (commissions originated at this event)
      db
        .select()
        .from(projects)
        .innerJoin(clients, eq(projects.clientId, clients.id))
        .where(eq(projects.eventId, eventId))
        .orderBy(asc(projects.createdAt)),
    ]);

    // Flatten joined rows (workaround for drizzle-orm orderSelectedFields bug)
    const allocations = allocationsRaw.map((r) => ({
      id: r.event_inventory_allocations.id,
      inventoryLotId: r.event_inventory_allocations.inventoryLotId,
      lotCode: r.inventory_lots.code,
      description: r.inventory_lots.description,
      unit: r.inventory_lots.unit,
      sourceLocationId: r.event_inventory_allocations.sourceLocationId,
      sourceLocationName: r.locations.name,
      plannedQuantity: r.event_inventory_allocations.plannedQuantity,
      openingQuantity: r.event_inventory_allocations.openingQuantity,
      closingQuantity: r.event_inventory_allocations.closingQuantity,
      status: r.event_inventory_allocations.status,
      notes: r.event_inventory_allocations.notes,
    }));

    const lots = lotsRaw.map((r) => ({
      id: r.inventory_lots.id,
      code: r.inventory_lots.code,
      description: r.inventory_lots.description,
      unit: r.inventory_lots.unit,
      retailPriceCents: r.catalog_pieces?.retailPriceCents ?? null,
      costCents: r.inventory_lots.unitCostCents,
    }));

    const linkedProjects = linkedProjectsRaw.map((r) => ({
      id: r.projects.id,
      projectNumber: r.projects.projectNumber,
      title: r.projects.title,
      stage: r.projects.stage,
      clientName: r.clients.displayName,
      targetDate: r.projects.targetDate,
    }));

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

    return json({ data: { event, tasks, budgetLines, allocations, stockSuggestions, linkedProjects }, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
