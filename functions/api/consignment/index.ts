import { asc } from "drizzle-orm";
import { activityEvents, consignments } from "../../../src/server/db/schema";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, json, readJson } from "../../_shared/http";
import { z } from "zod";

const createConsignmentInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  contactName: z.string().trim().max(160).optional().or(z.literal("")),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
}).transform((input) => ({
  ...input,
  contactName: input.contactName || undefined,
  contactEmail: input.contactEmail || undefined,
  contactPhone: input.contactPhone || undefined,
  address: input.address || undefined,
  notes: input.notes || undefined,
}));

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);

    const records = await db.select().from(consignments).orderBy(asc(consignments.name));
    return json({ data: records, requestId });
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
    const input = createConsignmentInput.parse(await readJson(request));

    const id = crypto.randomUUID();
    const [created] = await db
      .insert(consignments)
      .values({ id, ...input, createdBy: user.id })
      .returning();

    await db.insert(activityEvents).values({
      actorId: user.id,
      action: "consignment.created",
      entityType: "consignment",
      entityId: id,
      summary: `Created consignment "${input.name}"`,
      after: input,
      requestId,
    });

    return json({ data: created, requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
