import { desc, eq } from "drizzle-orm";
import { activityEvents, clients, events, projects } from "../../../src/server/db/schema";
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

    const [project] = await db
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

    if (!project) throw new HttpError(404, "Project not found.", "not_found");

    const activity = await db
      .select({
        id: activityEvents.id,
        action: activityEvents.action,
        summary: activityEvents.summary,
        createdAt: activityEvents.createdAt,
        actorName: activityEvents.actorId,
      })
      .from(activityEvents)
      .where(eq(activityEvents.entityId, projectId))
      .orderBy(desc(activityEvents.createdAt))
      .limit(20);

    return json({ data: { project, activity }, requestId });
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
        before: existing,
        after: updates,
        requestId,
      }),
    ]);

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
