import { eq } from "drizzle-orm";
import { activityEvents, suppliers } from "../../../src/server/db/schema";
import { updateSupplierInput } from "../../../src/server/finance/input";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, json, readJson } from "../../_shared/http";

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);

    const supplierId = (params as Record<string, string>).supplierId;
    const [record, [activity]] = await Promise.all([
      db.select().from(suppliers).where(eq(suppliers.id, supplierId)),
      db.select().from(activityEvents).where(eq(activityEvents.entityId, supplierId)),
    ]);

    if (!record) return json({ error: "Supplier not found", requestId }, { status: 404 });
    return json({ data: { ...record, activity }, requestId });
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

    const supplierId = (params as Record<string, string>).supplierId;
    const input = updateSupplierInput.parse(await readJson(request));
    const activityId = crypto.randomUUID();

    const [updatedRows] = await db.batch([
      db.update(suppliers).set({ ...input, updatedAt: new Date() }).where(eq(suppliers.id, supplierId)).returning(),
      db.insert(activityEvents).values({
        id: activityId,
        actorId: user.id,
        action: "supplier.updated",
        entityType: "supplier",
        entityId: supplierId,
        summary: "Updated supplier",
        after: input,
        requestId,
      }),
    ]);

    return json({ data: updatedRows[0], requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
