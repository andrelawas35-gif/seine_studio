import { asc, desc, eq } from "drizzle-orm";
import { activityEvents, pricingCalculations, pricingVersions } from "../../../src/server/db/schema";
import { createPricingCalculationInput, createPricingVersionInput } from "../../../src/server/pricing/input";
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

    const calculations = await db
      .select()
      .from(pricingCalculations)
      .orderBy(desc(pricingCalculations.updatedAt))
      .limit(100);

    const calcIds = calculations.map((c) => c.id);
    let versions: (typeof pricingVersions.$inferSelect)[] = [];
    if (calcIds.length > 0) {
      versions = await db
        .select()
        .from(pricingVersions)
        .where(
          // Get all versions for these calculations
          eq(pricingVersions.calculationId, calcIds[0]),
        )
        .orderBy(asc(pricingVersions.version));

      // If there are multiple calculations, get all their versions
      if (calcIds.length > 1) {
        const allVersions = [];
        for (const calcId of calcIds) {
          const v = await db
            .select()
            .from(pricingVersions)
            .where(eq(pricingVersions.calculationId, calcId))
            .orderBy(asc(pricingVersions.version));
          allVersions.push(...v);
        }
        versions = allVersions;
      }
    }

    const versionsByCalcId = new Map<string, typeof versions>();
    for (const v of versions) {
      const list = versionsByCalcId.get(v.calculationId) || [];
      list.push(v);
      versionsByCalcId.set(v.calculationId, list);
    }

    const data = calculations.map((calc) => ({
      ...calc,
      versions: versionsByCalcId.get(calc.id) || [],
    }));

    return json({ data, requestId });
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
    const body = await readJson(request) as Record<string, unknown>;

    const calcInput = createPricingCalculationInput.parse(body);
    const versionInput = createPricingVersionInput.parse(body);

    const calcId = crypto.randomUUID();
    const versionId = crypto.randomUUID();

    const [createdCalcs] = await db.batch([
      db.insert(pricingCalculations).values({
        id: calcId,
        title: calcInput.title,
        clientId: calcInput.clientId,
        projectId: calcInput.projectId,
        createdBy: user.id,
      }).returning(),
      db.insert(pricingVersions).values({
        id: versionId,
        calculationId: calcId,
        version: 1,
        inputs: versionInput.input as unknown as Record<string, unknown>,
        costLines: versionInput.input.lines as unknown as Array<Record<string, unknown>>,
        totalCostCents: versionInput.totalCostCents,
        suggestedPriceCents: versionInput.suggestedPriceCents,
        notes: versionInput.notes,
        createdBy: user.id,
      }),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "pricing_calculation.created",
        entityType: "pricing_calculation",
        entityId: calcId,
        summary: `Created pricing "${calcInput.title}"`,
        after: { ...calcInput, ...versionInput },
        requestId,
      }),
    ]);

    return json({ data: { ...createdCalcs[0], versionId }, requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
