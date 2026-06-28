import { and, asc, eq, ilike, isNull, or } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { activityEvents, clients, events, projects } from "../../../src/server/db/schema";
import { createProjectInput, projectListQuery } from "../../../src/server/projects/input";
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

    const url = new URL(request.url);
    const query = projectListQuery.parse(Object.fromEntries(url.searchParams));
    const search = query.q
      ? or(
          ilike(projects.title, `%${query.q}%`),
          ilike(projects.projectNumber, `%${query.q}%`),
        )
      : undefined;
    const stageFilter = query.stage ? eq(projects.stage, query.stage) : undefined;
    const eventFilter = query.eventId ? eq(projects.eventId, query.eventId) : undefined;
    const where = and(isNull(projects.archivedAt), search, stageFilter, eventFilter);

    const [records, [{ count }]] = await db.batch([
      db.select({
        id: projects.id,
        projectNumber: projects.projectNumber,
        clientId: projects.clientId,
        clientName: clients.name,
        eventId: projects.eventId,
        eventName: events.name,
        title: projects.title,
        stage: projects.stage,
        targetDate: projects.targetDate,
        brief: projects.brief,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
        .from(projects)
        .leftJoin(clients, eq(projects.clientId, clients.id))
        .leftJoin(events, eq(projects.eventId, events.id))
        .where(where)
        .orderBy(asc(projects.createdAt))
        .limit(query.limit)
        .offset(query.offset),
      db.select({ count: sql<number>`count(*)::int` }).from(projects).where(where),
    ]);

    return json({ data: records, pagination: { ...query, total: count }, requestId });
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
    const input = createProjectInput.parse(await readJson(request));

    const projectId = crypto.randomUUID();
    const values: Record<string, unknown> = {
      id: projectId,
      projectNumber: input.projectNumber,
      clientId: input.clientId,
      eventId: input.eventId || undefined,
      title: input.title,
      stage: input.stage,
    };
    if (input.targetDate) values.targetDate = new Date(input.targetDate);
    if (input.brief) values.brief = input.brief;

    await db.batch([
      db.insert(projects).values(values as typeof projects.$inferInsert).returning(),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "project.created",
        entityType: "project",
        entityId: projectId,
        summary: `Created project "${input.title}" (${input.projectNumber})`,
        after: input,
        requestId,
      }),
    ]);

    // Fetch with client and event joined
    const [result] = await db
      .select({
        id: projects.id,
        projectNumber: projects.projectNumber,
        clientId: projects.clientId,
        clientName: clients.name,
        eventId: projects.eventId,
        eventName: events.name,
        title: projects.title,
        stage: projects.stage,
        targetDate: projects.targetDate,
        brief: projects.brief,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .leftJoin(events, eq(projects.eventId, events.id))
      .where(eq(projects.id, projectId))
      .limit(1);

    return json({ data: result, requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
