import { eq } from "drizzle-orm";
import { activityEvents, clients, projects, quotes, quoteVersions } from "../../../src/server/db/schema";
import { updateQuoteInput } from "../../../src/server/finance/input";
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

    const quoteId = (params as Record<string, string>).quoteId;
    if (!quoteId) return json({ error: "Quote ID is required", requestId }, { status: 400 });

    const [record, versions, [activity]] = await Promise.all([
      db
        .select({
          id: quotes.id,
          quoteNumber: quotes.quoteNumber,
          clientId: quotes.clientId,
          clientName: clients.name,
          projectId: quotes.projectId,
          projectTitle: projects.title,
          pricingVersionId: quotes.pricingVersionId,
          status: quotes.status,
          depositPercent: quotes.depositPercent,
          terms: quotes.terms,
          validUntil: quotes.validUntil,
          acceptedAt: quotes.acceptedAt,
          notes: quotes.notes,
          createdBy: quotes.createdBy,
          createdAt: quotes.createdAt,
          updatedAt: quotes.updatedAt,
        })
        .from(quotes)
        .leftJoin(clients, eq(quotes.clientId, clients.id))
        .leftJoin(projects, eq(quotes.projectId, projects.id))
        .where(eq(quotes.id, quoteId)),
      db
        .select()
        .from(quoteVersions)
        .where(eq(quoteVersions.quoteId, quoteId))
        .orderBy(quoteVersions.version),
      db
        .select()
        .from(activityEvents)
        .where(eq(activityEvents.entityId, quoteId)),
    ]);

    if (!record) return json({ error: "Quote not found", requestId }, { status: 404 });

    return json({ data: { ...record, versions, activity }, requestId });
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

    const quoteId = (params as Record<string, string>).quoteId;
    if (!quoteId) return json({ error: "Quote ID is required", requestId }, { status: 400 });

    const input = updateQuoteInput.parse(await readJson(request));
    const activityId = crypto.randomUUID();

    const [updatedRows] = await db.batch([
      db
        .update(quotes)
        .set({
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.depositPercent !== undefined ? { depositPercent: input.depositPercent } : {}),
          ...(input.terms !== undefined ? { terms: input.terms } : {}),
          ...(input.validUntil !== undefined ? { validUntil: new Date(input.validUntil) } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.status === "accepted" ? { acceptedAt: new Date(), status: "accepted" as const } : {}),
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, quoteId))
        .returning(),
      db.insert(activityEvents).values({
        id: activityId,
        actorId: user.id,
        action: input.status ? `quote.${input.status}` : "quote.updated",
        entityType: "quote",
        entityId: quoteId,
        summary: input.status ? `Quote ${input.status}` : "Updated quote",
        after: input,
        requestId,
      }),
    ]);

    return json({ data: updatedRows[0], requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
