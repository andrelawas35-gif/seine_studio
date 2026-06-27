import { and, eq, inArray, sql } from "drizzle-orm";
import {
  activityEvents,
  eventInventoryAllocations,
  events,
  inventoryLots,
  locations,
  stockMovements,
} from "../../../../src/server/db/schema";
import { createEventAllocationInput } from "../../../../src/server/events/input";
import { uuidParam } from "../../../../src/server/inventory/input";
import { requireUser } from "../../../_shared/auth";
import { createDatabase } from "../../../_shared/db";
import { parseServerEnv, type Env } from "../../../_shared/env";
import { errorResponse, getRequestId, HttpError, json, readJson } from "../../../_shared/http";

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);
    const eventId = uuidParam.parse(params.eventId);
    const input = createEventAllocationInput.parse(await readJson(request));
    const [[event], [lot], [source], movementSums] = await Promise.all([
      db.select().from(events).where(eq(events.id, eventId)).limit(1),
      db.select().from(inventoryLots).where(eq(inventoryLots.id, input.inventoryLotId)).limit(1),
      db
        .select()
        .from(locations)
        .where(and(eq(locations.id, input.sourceLocationId), eq(locations.active, true)))
        .limit(1),
      db
        .select({ type: stockMovements.type, total: sql<string>`sum(${stockMovements.quantity})` })
        .from(stockMovements)
        .where(
          and(
            eq(stockMovements.inventoryLotId, input.inventoryLotId),
            inArray(stockMovements.type, [
              "receipt",
              "return",
              "release",
              "adjustment_increase",
              "reserve",
              "consume",
              "sale",
              "damage",
              "loss",
              "adjustment_decrease",
            ]),
          ),
        )
        .groupBy(stockMovements.type),
    ]);
    if (!event) throw new HttpError(404, "Event not found.", "event_not_found");
    if (!lot || lot.kind !== "finished_piece")
      throw new HttpError(404, "Finished inventory lot not found.", "lot_not_found");
    if (!source) throw new HttpError(404, "Source location not found.", "location_not_found");

    const adds = new Set(["receipt", "return", "release", "adjustment_increase"]);
    const available = movementSums.reduce((total, row) => total + (adds.has(row.type) ? 1 : -1) * Number(row.total), 0);
    const maximumPull = available * (1 - event.studioBufferPercent / 100);
    const quantity = Number(input.plannedQuantity);
    if (quantity > maximumPull) {
      throw new HttpError(
        409,
        `Only ${Math.max(0, maximumPull).toFixed(2)} ${lot.unit} can be reserved after the studio buffer.`,
        "insufficient_event_stock",
      );
    }

    const allocationId = crypto.randomUUID();
    const movementId = crypto.randomUUID();
    const [createdRows] = await db.batch([
      db
        .insert(eventInventoryAllocations)
        .values({
          id: allocationId,
          eventId,
          inventoryLotId: lot.id,
          sourceLocationId: source.id,
          plannedQuantity: input.plannedQuantity,
          status: "reserved",
          notes: input.notes || undefined,
        })
        .returning(),
      db.insert(stockMovements).values({
        id: movementId,
        inventoryLotId: lot.id,
        type: "reserve",
        quantity: input.plannedQuantity,
        fromLocationId: source.id,
        eventId,
        reason: `Reserved for ${event.name}`,
        createdBy: user.id,
        metadata: { allocationId },
      }),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "event.stock_reserved",
        entityType: "event",
        entityId: eventId,
        summary: `Reserved ${input.plannedQuantity} ${lot.unit} of ${lot.description}`,
        after: input,
        requestId,
      }),
    ]);
    return json(
      {
        data: {
          ...createdRows[0],
          lotCode: lot.code,
          description: lot.description,
          unit: lot.unit,
          sourceLocationName: source.name,
        },
        requestId,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
