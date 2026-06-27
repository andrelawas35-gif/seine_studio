import { eq, sql } from "drizzle-orm";
import { activityEvents, quoteVersions } from "../../../../src/server/db/schema";
import { createQuoteVersionInput } from "../../../../src/server/finance/input";
import { requireUser } from "../../../_shared/auth";
import { createDatabase } from "../../../_shared/db";
import { parseServerEnv, type Env } from "../../../_shared/env";
import { errorResponse, getRequestId, json, readJson } from "../../../_shared/http";

export const onRequestGet: PagesFunction<Env> = async ({ env, params, request }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);

    const quoteId = (params as Record<string, string>).quoteId;
    const versions = await db
      .select()
      .from(quoteVersions)
      .where(eq(quoteVersions.quoteId, quoteId))
      .orderBy(quoteVersions.version);

    return json({ data: versions, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ env, params, request }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);

    const quoteId = (params as Record<string, string>).quoteId;
    const input = createQuoteVersionInput.parse(await readJson(request));

    const [{ maxVersion }] = await db
      .select({ maxVersion: sql<number>`coalesce(max(${quoteVersions.version}), 0)` })
      .from(quoteVersions)
      .where(eq(quoteVersions.quoteId, quoteId));

    const versionId = crypto.randomUUID();
    const activityId = crypto.randomUUID();

    const [created] = await db.batch([
      db
        .insert(quoteVersions)
        .values({
          id: versionId,
          quoteId,
          version: maxVersion + 1,
          snapshot: input.snapshot,
          createdBy: user.id,
        })
        .returning(),
      db.insert(activityEvents).values({
        id: activityId,
        actorId: user.id,
        action: "quote.version_created",
        entityType: "quote_version",
        entityId: versionId,
        summary: `Created version ${maxVersion + 1} for quote ${quoteId}`,
        requestId,
      }),
    ]);

    return json({ data: created[0], requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
