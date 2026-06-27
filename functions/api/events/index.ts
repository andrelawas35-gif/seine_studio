import { desc, eq, sql } from "drizzle-orm";
import { activityEvents, events, eventTasks, locations } from "../../../src/server/db/schema";
import { createEventInput, DEFAULT_EVENT_TASKS, eventListQuery } from "../../../src/server/events/input";
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
    const query = eventListQuery.parse(Object.fromEntries(new URL(request.url).searchParams));
    const where = query.stage ? eq(events.stage, query.stage) : undefined;

    const [records, [{ count }]] = await db.batch([
      db.select().from(events).where(where).orderBy(desc(events.startsAt)).limit(query.limit).offset(query.offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(events)
        .where(where),
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
    const input = createEventInput.parse(await readJson(request));
    const eventId = crypto.randomUUID();
    const locationId = crypto.randomUUID();

    const values: typeof events.$inferInsert = {
      id: eventId,
      name: input.name,
      type: input.type,
      stage: "planning",
      organizer: input.organizer,
      venue: input.venue,
      instagramHandle: input.instagramHandle,
      locationId,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      revenueTargetCents: input.revenueTargetCents,
      budgetCents: input.budgetCents,
      studioBufferPercent: input.studioBufferPercent,
      notes: input.notes,
    };

    const [, createdRows] = await db.batch([
      db.insert(locations).values({
        id: locationId,
        name: `${input.name} · Event stock`,
        type: "event",
        address: input.address,
      }),
      db.insert(events).values(values).returning(),
      db.insert(eventTasks).values(DEFAULT_EVENT_TASKS.map((title, sortOrder) => ({ eventId, title, sortOrder }))),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "event.created",
        entityType: "event",
        entityId: eventId,
        summary: `Created event "${input.name}"`,
        after: input,
        requestId,
      }),
    ]);

    return json({ data: createdRows[0], requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
