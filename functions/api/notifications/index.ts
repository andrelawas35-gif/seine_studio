import { and, eq } from "drizzle-orm";
import { pushSubscriptions } from "../../../src/server/db/schema";
import {
  pushSubscribeInput,
  updatePreferencesInput,
} from "../../../src/server/notifications/input";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, json, readJson } from "../../_shared/http";

// ─── GET /api/notifications/status ──────────────────────────────────────

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);

    const [sub] = await db
      .select({
        id: pushSubscriptions.id,
        dailyReminder: pushSubscriptions.dailyReminder,
        reminderHour: pushSubscriptions.reminderHour,
        lastRemindedAt: pushSubscriptions.lastRemindedAt,
      })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, user.id));

    return json({
      data: {
        subscribed: !!sub,
        dailyReminder: sub?.dailyReminder ?? false,
        reminderHour: sub?.reminderHour ?? 9,
        lastRemindedAt: sub?.lastRemindedAt ?? null,
      },
      requestId,
    });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};

// ─── POST /api/notifications/subscribe ──────────────────────────────────

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);
    const input = pushSubscribeInput.parse(await readJson(request));

    // Upsert: remove any existing subscription for this endpoint, then insert
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, input.endpoint));

    const [created] = await db
      .insert(pushSubscriptions)
      .values({
        id: crypto.randomUUID(),
        userId: user.id,
        endpoint: input.endpoint,
        p256dhKey: input.p256dhKey,
        authKey: input.authKey,
        dailyReminder: true,
        reminderHour: 9,
      })
      .returning();

    return json({ data: created, requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};

// ─── PATCH /api/notifications/preferences ───────────────────────────────

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);
    const input = updatePreferencesInput.parse(await readJson(request));

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (input.dailyReminder !== undefined) updates.dailyReminder = input.dailyReminder;
    if (input.reminderHour !== undefined) updates.reminderHour = input.reminderHour;

    const [updated] = await db
      .update(pushSubscriptions)
      .set(updates)
      .where(eq(pushSubscriptions.userId, user.id))
      .returning();

    if (!updated) {
      return json(
        { error: { code: "not_found", message: "No active push subscription. Subscribe first." }, requestId },
        { status: 404 },
      );
    }

    return json({ data: updated, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};

// ─── DELETE /api/notifications/unsubscribe ──────────────────────────────

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    const user = await requireUser(request, serverEnv, db);

    // Parse the endpoint from the request body
    const body = (await readJson(request)) as Record<string, unknown>;
    const endpoint = body.endpoint as string | undefined;

    if (endpoint) {
      await db
        .delete(pushSubscriptions)
        .where(
          and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, endpoint)),
        );
    } else {
      // Delete all subscriptions for this user
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, user.id));
    }

    return json({ data: { unsubscribed: true }, requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
