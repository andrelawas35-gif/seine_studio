import { eq, sql } from "drizzle-orm";
import { activityEvents, events, eventTasks } from "../../../../src/server/db/schema";
import { createEventTaskInput } from "../../../../src/server/events/input";
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
    const eventId = uuidParam.parse(params.eventId);
    const input = createEventTaskInput.parse(await readJson(request));
    const [event] = await db.select({ id: events.id }).from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) throw new HttpError(404, "Event not found.", "event_not_found");
    const [{ nextOrder }] = await db
      .select({ nextOrder: sql<number>`coalesce(max(${eventTasks.sortOrder}), -1)::int + 1` })
      .from(eventTasks)
      .where(eq(eventTasks.eventId, eventId));
    const taskId = crypto.randomUUID();
    const [createdRows] = await db.batch([
      db
        .insert(eventTasks)
        .values({
          id: taskId,
          eventId,
          title: input.title,
          dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
          notes: input.notes || undefined,
          sortOrder: nextOrder,
        })
        .returning(),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "event.task_created",
        entityType: "event",
        entityId: eventId,
        summary: `Added event task "${input.title}"`,
        after: input,
        requestId,
      }),
    ]);
    return json({ data: createdRows[0], requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
