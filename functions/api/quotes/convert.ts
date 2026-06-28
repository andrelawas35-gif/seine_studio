import { eq, sql } from "drizzle-orm";
import { activityEvents, clients, projects, quotes, catalogPieces } from "../../../src/server/db/schema";
import { z } from "zod";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, json, readJson } from "../../_shared/http";
import type { PagesFunction } from "@cloudflare/workers-types";

const convertQuoteInput = z.object({
  quoteId: z.string().uuid(),
  clientId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  brief: z.string().trim().max(5000).optional(),
  depositPercent: z.number().int().min(0).max(100).optional(),
  catalogPieceId: z.string().uuid().optional(),
});

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);
    const input = convertQuoteInput.parse(await readJson(request));

    // Verify the quote exists and is in accepted state
    const [quote] = await db
      .select({ id: quotes.id, status: quotes.status, clientId: quotes.clientId })
      .from(quotes)
      .where(eq(quotes.id, input.quoteId));

    if (!quote) {
      return json({ error: "Quote not found", requestId }, { status: 404 });
    }
    if (quote.status !== "accepted") {
      return json({ error: "Only accepted quotes can be converted to projects", requestId }, { status: 400 });
    }

    // Auto-generate project number: PRJ-XXXX
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects);
    const projectNumber = `PRJ-${String(count + 1).padStart(4, "0")}`;

    const projectId = crypto.randomUUID();

    // Verify client exists
    const [client] = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.id, input.clientId));

    // Build project values
    const values: Record<string, unknown> = {
      id: projectId,
      projectNumber,
      clientId: input.clientId,
      title: input.title,
      stage: "inquiry" as const,
      brief: input.brief || null,
    };

    if (input.catalogPieceId) {
      // Verify piece exists
      const [piece] = await db
        .select({ id: catalogPieces.id })
        .from(catalogPieces)
        .where(eq(catalogPieces.id, input.catalogPieceId));
      if (piece) values.catalogPieceId = input.catalogPieceId;
    }

    await db.batch([
      db.insert(projects).values(values as typeof projects.$inferInsert),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "project.created_from_quote",
        entityType: "project",
        entityId: projectId,
        summary: `Created project "${input.title}" (${projectNumber}) from quote`,
        after: { quoteId: input.quoteId, ...values },
        requestId,
      }),
    ]);

    return json({
      data: { id: projectId, projectNumber },
      requestId,
    }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
