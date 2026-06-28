import { and, eq } from "drizzle-orm";
import { activityEvents, eventPriceList } from "../../../../src/server/db/schema";
import { uuidParam } from "../../../../src/server/inventory/input";
import { requireUser } from "../../../_shared/auth";
import { createDatabase } from "../../../_shared/db";
import { parseServerEnv, type Env } from "../../../_shared/env";
import { errorResponse, getRequestId, json, readJson } from "../../../_shared/http";
import { z } from "zod";

const createEventPriceInput = z.object({
  catalogPieceId: z.string().uuid("Catalog piece is required"),
  priceCents: z.number().int().min(0),
  notes: z.string().trim().max(500).optional(),
});

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);
    const eventId = uuidParam.parse(params.eventId);
    const input = createEventPriceInput.parse(await readJson(request));

    // Upsert: insert or update
    const [existing] = await db
      .select()
      .from(eventPriceList)
      .where(and(eq(eventPriceList.eventId, eventId), eq(eventPriceList.catalogPieceId, input.catalogPieceId)))
      .limit(1);

    let result;
    if (existing) {
      [result] = await db
        .update(eventPriceList)
        .set({ priceCents: input.priceCents, notes: input.notes ?? null, updatedAt: new Date() })
        .where(eq(eventPriceList.id, existing.id))
        .returning();
    } else {
      const id = crypto.randomUUID();
      [result] = await db
        .insert(eventPriceList)
        .values({
          id,
          eventId,
          catalogPieceId: input.catalogPieceId,
          priceCents: input.priceCents,
          notes: input.notes ?? null,
        })
        .returning();
    }

    await db.insert(activityEvents).values({
      actorId: user.id,
      action: existing ? "event_price.updated" : "event_price.created",
      entityType: "event_price",
      entityId: result.id,
      summary: `${existing ? "Updated" : "Set"} event price for piece to ${input.priceCents / 100} PHP`,
      requestId,
    });

    return json({ data: result, requestId }, { status: existing ? 200 : 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
