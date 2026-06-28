import { asc, desc, eq, isNull } from "drizzle-orm";
import { activityEvents, replyTemplates, replyTemplateVersions } from "../../../src/server/db/schema";
import { createReplyTemplateInput, createReplyTemplateVersionInput } from "../../../src/server/replies/input";
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

    const templates = await db
      .select()
      .from(replyTemplates)
      .where(isNull(replyTemplates.archivedAt))
      .orderBy(asc(replyTemplates.name));

    const templateIds = templates.map((t) => t.id);
    let versions: (typeof replyTemplateVersions.$inferSelect)[] = [];

    if (templateIds.length > 0) {
      const allVersions = [];
      for (const templateId of templateIds) {
        const v = await db
          .select()
          .from(replyTemplateVersions)
          .where(eq(replyTemplateVersions.templateId, templateId))
          .orderBy(desc(replyTemplateVersions.version))
          .limit(1);
        allVersions.push(...v);
      }
      versions = allVersions;
    }

    const latestByTemplateId = new Map(versions.map((v) => [v.templateId, v]));

    const data = templates.map((t) => ({
      ...t,
      latestVersion: latestByTemplateId.get(t.id) || null,
    }));

    return json({ data, requestId });
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
    const body = await readJson(request) as Record<string, unknown>;

    const templateInput = createReplyTemplateInput.parse(body);
    const versionInput = createReplyTemplateVersionInput.parse(body);

    const templateId = crypto.randomUUID();
    const versionId = crypto.randomUUID();

    const [createdTemplates] = await db.batch([
      db.insert(replyTemplates).values({
        id: templateId,
        name: templateInput.name,
        category: templateInput.category,
      }).returning(),
      db.insert(replyTemplateVersions).values({
        id: versionId,
        templateId,
        version: 1,
        body: versionInput.body,
        variables: versionInput.variables,
        createdBy: user.id,
      }),
      db.insert(activityEvents).values({
        actorId: user.id,
        action: "reply_template.created",
        entityType: "reply_template",
        entityId: templateId,
        summary: `Created reply template "${templateInput.name}"`,
        after: { ...templateInput, ...versionInput },
        requestId,
      }),
    ]);

    return json({ data: { ...createdTemplates[0], versionId }, requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
