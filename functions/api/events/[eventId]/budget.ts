import { eq } from "drizzle-orm";
import { activityEvents, eventBudgetLines, events } from "../../../../src/server/db/schema";
import { createEventBudgetLineInput } from "../../../../src/server/events/input";
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
    const input = createEventBudgetLineInput.parse(await readJson(request));
    const [event] = await db.select({ id: events.id }).from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) throw new HttpError(404, "Event not found.", "event_not_found");
    const budgetId = crypto.randomUUID();
    const [createdRows] = await db.batch([
      db
        .insert(eventBudgetLines)
        .values({ id: budgetId, eventId, ...input })
        .returning(),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "event.budget_line_created",
        entityType: "event",
        entityId: eventId,
        summary: `Added event budget line "${input.description}"`,
        after: input,
        requestId,
      }),
    ]);
    return json({ data: createdRows[0], requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
