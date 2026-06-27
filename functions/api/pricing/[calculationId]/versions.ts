import { eq, sql } from "drizzle-orm";
import { activityEvents, pricingCalculations, pricingVersions } from "../../../../src/server/db/schema";
import { createPricingVersionInput } from "../../../../src/server/pricing/input";
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
    const calculationId = uuidParam.parse(params.calculationId);
    const input = createPricingVersionInput.parse(await readJson(request));

    const [calc] = await db
      .select()
      .from(pricingCalculations)
      .where(eq(pricingCalculations.id, calculationId))
      .limit(1);
    if (!calc) throw new HttpError(404, "Pricing calculation not found.", "not_found");

    const [{ maxVersion }] = await db
      .select({ maxVersion: sql<number>`coalesce(max(${pricingVersions.version}), 0)::int` })
      .from(pricingVersions)
      .where(eq(pricingVersions.calculationId, calculationId));

    const versionId = crypto.randomUUID();
    const nextVersion = maxVersion + 1;

    await db.batch([
      db.insert(pricingVersions).values({
        id: versionId,
        calculationId,
        version: nextVersion,
        inputs: input.input as unknown as Record<string, unknown>,
        costLines: input.input.lines as unknown as Array<Record<string, unknown>>,
        totalCostCents: input.totalCostCents,
        suggestedPriceCents: input.suggestedPriceCents,
        notes: input.notes,
        createdBy: user.id,
      }),
      db.update(pricingCalculations)
        .set({ updatedAt: new Date() })
        .where(eq(pricingCalculations.id, calculationId)),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "pricing_calculation.version_created",
        entityType: "pricing_calculation",
        entityId: calculationId,
        summary: `Saved version ${nextVersion} of "${calc.title}"`,
        after: input,
        requestId,
      }),
    ]);

    return json({ data: { id: versionId, version: nextVersion, calculationId }, requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
