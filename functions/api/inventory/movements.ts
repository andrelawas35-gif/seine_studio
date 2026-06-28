import { and, eq, isNull } from "drizzle-orm";
import { activityEvents, inventoryLots, stockMovements } from "../../../src/server/db/schema";
import { createStockMovementInput } from "../../../src/server/inventory/input";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, HttpError, json, readJson } from "../../_shared/http";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);
    const input = createStockMovementInput.parse(await readJson(request));

    const [lot] = await db
      .select()
      .from(inventoryLots)
      .where(and(eq(inventoryLots.id, input.inventoryLotId), isNull(inventoryLots.archivedAt)))
      .limit(1);
    if (!lot) throw new HttpError(404, "Inventory lot not found.", "lot_not_found");

    const movementId = crypto.randomUUID();

    const [createdRows] = await db.batch([
      db.insert(stockMovements).values({
        id: movementId,
        inventoryLotId: input.inventoryLotId,
        type: input.type,
        quantity: input.quantity,
        fromLocationId: input.fromLocationId,
        toLocationId: input.toLocationId,
        projectId: input.projectId,
        eventId: input.eventId,
        reason: input.reason,
        createdBy: user.id,
      }).returning(),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: `stock.${input.type}`,
        entityType: "inventory_lot",
        entityId: input.inventoryLotId,
        summary: `${input.type}: ${input.quantity} ${lot.unit} of ${lot.description}`,
        after: input,
        requestId,
      }),
    ]);

    return json({ data: createdRows[0], requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
