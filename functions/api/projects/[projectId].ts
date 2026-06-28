import { and, desc, eq, sql } from "drizzle-orm";
import { activityEvents, clients, events, invoices, payments, projects, quotes } from "../../../src/server/db/schema";
import { updateProjectInput } from "../../../src/server/projects/input";
import { uuidParam } from "../../../src/server/inventory/input";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, HttpError, json, readJson } from "../../_shared/http";

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);
    const projectId = uuidParam.parse(params.projectId);

    const [projectRow] = await db
      .select()
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .leftJoin(events, eq(projects.eventId, events.id))
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!projectRow) throw new HttpError(404, "Project not found.", "not_found");

    const project = {
      id: projectRow.projects.id,
      projectNumber: projectRow.projects.projectNumber,
      clientId: projectRow.projects.clientId,
      clientName: projectRow.clients?.name ?? null,
      eventId: projectRow.projects.eventId,
      eventName: projectRow.events?.name ?? null,
      title: projectRow.projects.title,
      stage: projectRow.projects.stage,
      targetDate: projectRow.projects.targetDate,
      brief: projectRow.projects.brief,
      createdAt: projectRow.projects.createdAt,
      updatedAt: projectRow.projects.updatedAt,
    };

    const activity = await db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.entityId, projectId))
      .orderBy(desc(activityEvents.createdAt))
      .limit(20);

    // Derived financials: agreed price from accepted quote + balance from invoices
    const [acceptedQuote] = await db
      .select()
      .from(quotes)
      .where(and(eq(quotes.projectId, projectId), eq(quotes.status, "accepted")))
      .limit(1);

    const invoiceSums = await db
      .select({
        invoiced: sql<number>`coalesce(sum(${invoices.totalCents}), 0)::int`,
        paid: sql<number>`coalesce(sum(${invoices.paidCents}), 0)::int`,
      })
      .from(invoices)
      .where(eq(invoices.projectId, projectId));

    const finance = {
      agreedPriceCents: Number(acceptedQuote?.totalCents ?? 0),
      invoicedCents: invoiceSums[0]?.invoiced ?? 0,
      paidCents: invoiceSums[0]?.paid ?? 0,
    };

    return json({ data: { project, activity, finance }, requestId });
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
    const projectId = uuidParam.parse(params.projectId);
    const input = updateProjectInput.parse(await readJson(request));

    const [existing] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!existing) throw new HttpError(404, "Project not found.", "not_found");
    const { expectedUpdatedAt, ...updates } = input;
    if (expectedUpdatedAt && existing.updatedAt.toISOString() !== expectedUpdatedAt) {
      throw new HttpError(409, "This project changed on another device. Review it before trying again.", "project_conflict");
    }

    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.title !== undefined) set.title = updates.title;
    if (updates.clientId !== undefined) set.clientId = updates.clientId;
    if (updates.eventId !== undefined) set.eventId = updates.eventId;
    if (updates.stage !== undefined) set.stage = updates.stage;
    if (updates.targetDate !== undefined) set.targetDate = updates.targetDate ? new Date(updates.targetDate) : null;
    if (updates.brief !== undefined) set.brief = updates.brief;

    await db.batch([
      db.update(projects).set(set).where(eq(projects.id, projectId)),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "project.updated",
        entityType: "project",
        entityId: projectId,
        summary: `Updated project "${existing.title}"`,
        before: JSON.parse(JSON.stringify(existing)) as Record<string, unknown>,
        after: JSON.parse(JSON.stringify(updates)) as Record<string, unknown>,
        requestId,
      }),
    ]);

    const [row] = await db
      .select()
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .leftJoin(events, eq(projects.eventId, events.id))
      .where(eq(projects.id, projectId))
      .limit(1);

    const result = {
      id: row.projects.id,
      projectNumber: row.projects.projectNumber,
      clientId: row.projects.clientId,
      clientName: row.clients?.name ?? null,
      eventId: row.projects.eventId,
      eventName: row.events?.name ?? null,
      title: row.projects.title,
      stage: row.projects.stage,
      targetDate: row.projects.targetDate,
      brief: row.projects.brief,
      createdAt: row.projects.createdAt,
      updatedAt: row.projects.updatedAt,
    };

    return json({ data: result, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);
    const projectId = uuidParam.parse(params.projectId);

    const [existing] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!existing) throw new HttpError(404, "Project not found.", "not_found");

    await db.batch([
      db.update(projects)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(projects.id, projectId)),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "project.archived",
        entityType: "project",
        entityId: projectId,
        summary: `Archived project "${existing.title}"`,
        before: existing,
        requestId,
      }),
    ]);

    return json({ data: { archived: true }, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
