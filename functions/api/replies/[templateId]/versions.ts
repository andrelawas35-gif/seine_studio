import { eq, sql } from "drizzle-orm";
import { activityEvents, replyTemplates, replyTemplateVersions } from "../../../../src/server/db/schema";
import { createReplyTemplateVersionInput } from "../../../../src/server/pricing/input";
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
    const templateId = uuidParam.parse(params.templateId);
    const input = createReplyTemplateVersionInput.parse(await readJson(request));

    const [template] = await db
      .select()
      .from(replyTemplates)
      .where(eq(replyTemplates.id, templateId))
      .limit(1);
    if (!template) throw new HttpError(404, "Reply template not found.", "not_found");

    const [{ maxVersion }] = await db
      .select({ maxVersion: sql<number>`coalesce(max(${replyTemplateVersions.version}), 0)::int` })
      .from(replyTemplateVersions)
      .where(eq(replyTemplateVersions.templateId, templateId));

    const versionId = crypto.randomUUID();
    const nextVersion = maxVersion + 1;

    await db.batch([
      db.insert(replyTemplateVersions).values({
        id: versionId,
        templateId,
        version: nextVersion,
        body: input.body,
        variables: input.variables,
        createdBy: user.id,
      }),
      db.update(replyTemplates)
        .set({ updatedAt: new Date() })
        .where(eq(replyTemplates.id, templateId)),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "reply_template.version_created",
        entityType: "reply_template",
        entityId: templateId,
        summary: `Saved version ${nextVersion} of "${template.name}"`,
        after: input,
        requestId,
      }),
    ]);

    return json({ data: { id: versionId, version: nextVersion, templateId }, requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
