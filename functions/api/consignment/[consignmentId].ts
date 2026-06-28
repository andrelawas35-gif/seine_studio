import { eq } from "drizzle-orm";
import { activityEvents, consignments, consignmentCounts, consignmentCountItems } from "../../../src/server/db/schema";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, HttpError, json, readJson } from "../../_shared/http";
import { z } from "zod";

const uuidParam = z.string().uuid();

const createCountInput = z.object({
  countedAt: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  items: z.array(z.object({
    inventoryLotId: z.string().uuid(),
    countedQuantity: z.number().min(0),
    expectedQuantity: z.number().min(0).optional(),
    discrepancyNote: z.string().trim().max(500).optional().or(z.literal("")),
  })).min(1, "At least one inventory item is required"),
});

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);
    const consignmentId = uuidParam.parse(params.consignmentId);

    const [record] = await db.select().from(consignments).where(eq(consignments.id, consignmentId)).limit(1);
    if (!record) throw new HttpError(404, "Consignment not found.", "not_found");

    const counts = await db
      .select({
        id: consignmentCounts.id,
        consignmentId: consignmentCounts.consignmentId,
        countedAt: consignmentCounts.countedAt,
        notes: consignmentCounts.notes,
        createdBy: consignmentCounts.createdBy,
        createdAt: consignmentCounts.createdAt,
        items: consignmentCountItems,
      })
      .from(consignmentCounts)
      .leftJoin(consignmentCountItems, eq(consignmentCounts.id, consignmentCountItems.consignmentCountId))
      .where(eq(consignmentCounts.consignmentId, consignmentId))
      .orderBy(consignmentCounts.countedAt);

    // Group items by count
    type CountRow = typeof counts[number];
    type CountItem = NonNullable<CountRow["items"]>;
    const countMap = new Map<string, Omit<CountRow, "items"> & { items: CountItem[] }>();
    for (const row of counts) {
      const { items: rowItem, ...rest } = row;
      if (!countMap.has(row.id)) {
        countMap.set(row.id, { ...rest, items: [] });
      }
      if (rowItem?.id) {
        countMap.get(row.id)!.items.push(rowItem);
      }
    }

    return json({ data: { ...record, counts: Array.from(countMap.values()) }, requestId });
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
    const consignmentId = uuidParam.parse(params.consignmentId);

    const input = (await readJson(request)) as Record<string, unknown>;
    const [existing] = await db.select().from(consignments).where(eq(consignments.id, consignmentId)).limit(1);
    if (!existing) throw new HttpError(404, "Consignment not found.", "not_found");

    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) set.name = input.name;
    if (input.contactName !== undefined) set.contactName = input.contactName;
    if (input.contactEmail !== undefined) set.contactEmail = input.contactEmail;
    if (input.contactPhone !== undefined) set.contactPhone = input.contactPhone;
    if (input.address !== undefined) set.address = input.address;
    if (input.notes !== undefined) set.notes = input.notes;
    if (input.isActive !== undefined) set.isActive = input.isActive;

    const [updated] = await db.update(consignments).set(set).where(eq(consignments.id, consignmentId)).returning();

    await db.insert(activityEvents).values({
      actorId: user.id,
      action: "consignment.updated",
      entityType: "consignment",
      entityId: consignmentId,
      summary: `Updated consignment "${existing.name}"`,
      before: { name: existing.name },
      after: { name: updated.name },
      requestId,
    });

    return json({ data: updated, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);
    const consignmentId = uuidParam.parse(params.consignmentId);

    const [consignment] = await db.select().from(consignments).where(eq(consignments.id, consignmentId)).limit(1);
    if (!consignment) throw new HttpError(404, "Consignment not found.", "not_found");

    const input = createCountInput.parse(await readJson(request));
    const countId = crypto.randomUUID();

    await db.insert(consignmentCounts).values({
      id: countId,
      consignmentId,
      countedAt: new Date(input.countedAt),
      notes: input.notes,
      createdBy: user.id,
    });

    await db.insert(consignmentCountItems).values(
      input.items.map((item) => ({
        id: crypto.randomUUID(),
        consignmentCountId: countId,
        inventoryLotId: item.inventoryLotId,
        countedQuantity: String(item.countedQuantity),
        expectedQuantity: item.expectedQuantity !== undefined ? String(item.expectedQuantity) : null,
        discrepancyNote: item.discrepancyNote || undefined,
      })),
    );

    await db.insert(activityEvents).values({
      actorId: user.id,
      action: "consignment.count_created",
      entityType: "consignment_count",
      entityId: countId,
      summary: `Recorded consignment count for "${consignment.name}"`,
      after: { countedAt: input.countedAt, itemCount: input.items.length },
      requestId,
    });

    return json({ data: { id: countId, countedAt: input.countedAt, itemCount: input.items.length }, requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
