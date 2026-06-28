import { and, asc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { activityEvents, catalogPieces, inventoryLots, stockMovements } from "../../../src/server/db/schema";
import { createInventoryLotInput, listQuery } from "../../../src/server/inventory/input";
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
    const query = listQuery.parse(Object.fromEntries(url.searchParams));
    const search = query.q
      ? or(ilike(inventoryLots.description, `%${query.q}%`), ilike(inventoryLots.code, `%${query.q}%`))
      : undefined;
    const kindFilter = query.kind ? eq(inventoryLots.kind, query.kind) : undefined;
    const where = and(isNull(inventoryLots.archivedAt), search, kindFilter);

    const [records, [{ count }]] = await db.batch([
      db.select()
        .from(inventoryLots)
        .leftJoin(catalogPieces, eq(inventoryLots.catalogPieceId, catalogPieces.id))
        .where(where)
        .orderBy(asc(inventoryLots.description))
        .limit(query.limit)
        .offset(query.offset),
      db.select({ count: sql<number>`count(*)::int` }).from(inventoryLots).where(where),
    ]);

    // Transform joined rows into the expected flat shape
    const flatRecords = records.map((r) => ({
      ...r.inventory_lots,
      catalogPieceSku: r.catalog_pieces?.sku ?? null,
      catalogPieceName: r.catalog_pieces?.name ?? null,
    }));

    // Derive on-hand balances from stock movements for each lot
    const lotIds = flatRecords.map((r) => r.id);
    const balances: Record<string, number> = {};

    if (lotIds.length > 0) {
      // For each movement type, determine if it adds or subtracts from on-hand:
      // Adds: receipt, return, adjustment(to), release(reservation freed)
      // Subtracts: consume, sale, damage, loss, reserve, transfer(from)
      // We use the signed convention: movements with toLocationId add, fromLocationId subtract.
      // The on-hand balance = initialQuantity + SUM(receipts/returns) - SUM(sales/consumes/damages/losses)
      const movementSums = await db
        .select({
          inventoryLotId: stockMovements.inventoryLotId,
          type: stockMovements.type,
          total: sql<string>`sum(${stockMovements.quantity})`,
        })
        .from(stockMovements)
        .where(sql`${stockMovements.inventoryLotId} = ANY(ARRAY[${sql.join(lotIds.map((id) => sql`${id}::uuid`), sql`, `)}])`)
        .groupBy(stockMovements.inventoryLotId, stockMovements.type);

      const adds = new Set(["receipt", "return", "release", "adjustment_increase"]);
      const subtracts = new Set(["consume", "sale", "damage", "loss", "reserve", "adjustment_decrease"]);

      for (const row of movementSums) {
        const qty = parseFloat(row.total);
        if (!balances[row.inventoryLotId]) balances[row.inventoryLotId] = 0;
        if (adds.has(row.type)) balances[row.inventoryLotId] += qty;
        else if (subtracts.has(row.type)) balances[row.inventoryLotId] -= qty;
        // `transfer` moves stock between locations without changing the lot-wide
        // total, so it is intentionally neutral here. Legacy `adjustment` (no
        // direction) is likewise ignored; new corrections use the directional types.
      }
    }

    // On-hand is derived purely from append-only movements. Lot creation always
    // writes an initial `receipt` movement for initialQuantity, so seeding the
    // balance with initialQuantity here would double-count it.
    const data = flatRecords.map((lot) => ({
      ...lot,
      catalogPieceName: lot.catalogPieceName ?? null,
      catalogPieceSku: lot.catalogPieceSku ?? null,
      onHandQuantity: String(balances[lot.id] ?? 0),
    }));

    return json({ data, pagination: { ...query, total: count }, requestId });
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
    const input = createInventoryLotInput.parse(await readJson(request));
    const lotId = crypto.randomUUID();
    const movementId = crypto.randomUUID();

    const { locationId, ...lotValues } = input;

    const [createdRows] = await db.batch([
      db.insert(inventoryLots).values({ id: lotId, ...lotValues }).returning(),
      db.insert(stockMovements).values({
        id: movementId,
        inventoryLotId: lotId,
        type: "receipt",
        quantity: input.initialQuantity,
        toLocationId: locationId,
        reason: "Initial receipt",
        createdBy: user.id,
      }),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "inventory_lot.created",
        entityType: "inventory_lot",
        entityId: lotId,
        summary: `Received ${input.initialQuantity} ${input.unit} of ${input.description}`,
        after: input,
        requestId,
      }),
    ]);

    return json({
      data: { ...createdRows[0], onHandQuantity: input.initialQuantity },
      requestId,
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
