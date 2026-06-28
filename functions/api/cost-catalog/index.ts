import { and, eq, type SQL } from "drizzle-orm";
import { activityEvents, costCatalog } from "../../../src/server/db/schema";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, HttpError, json, readJson } from "../../_shared/http";
import { z } from "zod";

const costTypeEnum = z.enum([
  "material", "labor", "design", "packaging", "outsourced",
  "overhead", "other", "stones_gemstones", "metal_findings",
  "finishing_plating", "setting_engraving",
]);

const createEntryInput = z.object({
  costType: costTypeEnum,
  description: z.string().trim().min(1, "Description is required").max(300),
  unit: z.string().trim().min(1, "Unit is required").max(40),
  unitCostCents: z.number().int().min(0),
});

const updateEntryInput = z.object({
  costType: costTypeEnum.optional(),
  description: z.string().trim().min(1).max(300).optional(),
  unit: z.string().trim().min(1).max(40).optional(),
  unitCostCents: z.number().int().min(0).optional(),
});

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);

    const url = new URL(request.url);
    const costTypeParam = url.searchParams.get("cost_type");

    let where: SQL | undefined = eq(costCatalog.isArchived, false);
    if (costTypeParam) {
      const parsed = costTypeEnum.safeParse(costTypeParam);
      if (parsed.success) {
        where = and(where, eq(costCatalog.costType, parsed.data));
      }
    }

    const records = await db
      .select({
        id: costCatalog.id,
        costType: costCatalog.costType,
        description: costCatalog.description,
        unit: costCatalog.unit,
        unitCostCents: costCatalog.unitCostCents,
        isArchived: costCatalog.isArchived,
        createdAt: costCatalog.createdAt,
        updatedAt: costCatalog.updatedAt,
      })
      .from(costCatalog)
      .where(where)
      .orderBy(costCatalog.costType, costCatalog.description);

    return json({ entries: records, requestId });
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
    const input = createEntryInput.parse(await readJson(request));

    const id = crypto.randomUUID();
    const [created] = await db
      .insert(costCatalog)
      .values({
        id,
        costType: input.costType,
        description: input.description,
        unit: input.unit,
        unitCostCents: input.unitCostCents,
        createdBy: user.id,
        isArchived: false,
      })
      .returning();

    await db.insert(activityEvents).values({
      actorId: user.id,
      action: "cost_catalog.created",
      entityType: "cost_catalog",
      entityId: id,
      summary: `Added "${input.description}" (${input.costType}) to cost catalog`,
      after: input,
      requestId,
    });

    return json({ data: created, requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);

    const url = new URL(request.url);
    const entryId = url.searchParams.get("id");
    if (!entryId) throw new HttpError(400, "The entry id is required (e.g. ?id=uuid).", "missing_id");

    const input = updateEntryInput.parse(await readJson(request));
    const [existing] = await db.select().from(costCatalog).where(eq(costCatalog.id, entryId)).limit(1);
    if (!existing) throw new HttpError(404, "Cost catalog entry not found.", "not_found");

    const [updated] = await db
      .update(costCatalog)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(costCatalog.id, entryId))
      .returning();

    await db.insert(activityEvents).values({
      actorId: user.id,
      action: "cost_catalog.updated",
      entityType: "cost_catalog",
      entityId: entryId,
      summary: `Updated "${existing.description}" in cost catalog`,
      before: { description: existing.description, unitCostCents: existing.unitCostCents },
      after: { description: input.description, unitCostCents: input.unitCostCents },
      requestId,
    });

    return json({ data: updated, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);

    const url = new URL(request.url);
    const entryId = url.searchParams.get("id");
    if (!entryId) throw new HttpError(400, "The entry id is required (e.g. ?id=uuid).", "missing_id");

    const [existing] = await db.select().from(costCatalog).where(eq(costCatalog.id, entryId)).limit(1);
    if (!existing) throw new HttpError(404, "Cost catalog entry not found.", "not_found");

    // Soft-archive
    await db.update(costCatalog).set({ isArchived: true, updatedAt: new Date() }).where(eq(costCatalog.id, entryId));

    await db.insert(activityEvents).values({
      actorId: user.id,
      action: "cost_catalog.archived",
      entityType: "cost_catalog",
      entityId: entryId,
      summary: `Archived "${existing.description}" from cost catalog`,
      requestId,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
