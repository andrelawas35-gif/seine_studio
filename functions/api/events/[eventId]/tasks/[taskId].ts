import { and, eq } from "drizzle-orm";
import { activityEvents, eventTasks } from "../../../../../src/server/db/schema";
import { updateEventTaskInput } from "../../../../../src/server/events/input";
import { uuidParam } from "../../../../../src/server/inventory/input";
import { requireUser } from "../../../../_shared/auth";
import { createDatabase } from "../../../../_shared/db";
import { parseServerEnv, type Env } from "../../../../_shared/env";
import { errorResponse, getRequestId, HttpError, json, readJson } from "../../../../_shared/http";

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);
    const eventId = uuidParam.parse(params.eventId);
    const taskId = uuidParam.parse(params.taskId);
    const input = updateEventTaskInput.parse(await readJson(request));
    const [existing] = await db
      .select()
      .from(eventTasks)
      .where(and(eq(eventTasks.id, taskId), eq(eventTasks.eventId, eventId)))
      .limit(1);
    if (!existing) throw new HttpError(404, "Event task not found.", "task_not_found");
    const [updatedRows] = await db.batch([
      db
        .update(eventTasks)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(eventTasks.id, taskId))
        .returning(),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "event.task_updated",
        entityType: "event",
        entityId: eventId,
        summary: `Updated event task "${existing.title}"`,
        before: existing,
        after: input,
        requestId,
      }),
    ]);
    return json({ data: updatedRows[0], requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
