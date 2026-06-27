import { eq, sql } from "drizzle-orm";
import {
  activityEvents,
  appUsers,
  catalogPieces,
  certificates,
  certificateRevisions,
  clients,
} from "../../../src/server/db/schema";
import {
  updateCertificateInput,
  issueCertificateInput,
  revokeCertificateInput,
  reissueCertificateInput,
} from "../../../src/server/trust/input";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, json, readJson } from "../../_shared/http";

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);
    const certId = params.certId as string;

    const [cert] = await db
      .select({
        id: certificates.id,
        certificateNumber: certificates.certificateNumber,
        status: certificates.status,
        pieceName: certificates.pieceName,
        metalType: certificates.metalType,
        karat: certificates.karat,
        stoneSpecifications: certificates.stoneSpecifications,
        weightGrams: certificates.weightGrams,
        dimensions: certificates.dimensions,
        completionDate: certificates.completionDate,
        careGuidance: certificates.careGuidance,
        signatory: certificates.signatory,
        verificationCode: certificates.verificationCode,
        revokedReason: certificates.revokedReason,
        notes: certificates.notes,
        catalogPieceId: certificates.catalogPieceId,
        pieceSku: catalogPieces.sku,
        clientId: certificates.clientId,
        clientName: clients.name,
        createdBy: certificates.createdBy,
        createdAt: certificates.createdAt,
        updatedAt: certificates.updatedAt,
      })
      .from(certificates)
      .leftJoin(catalogPieces, eq(certificates.catalogPieceId, catalogPieces.id))
      .leftJoin(clients, eq(certificates.clientId, clients.id))
      .where(eq(certificates.id, certId));

    if (!cert) {
      return json({ error: { code: "not_found", message: "Certificate not found" }, requestId }, { status: 404 });
    }

    const revisions = await db
      .select({
        id: certificateRevisions.id,
        version: certificateRevisions.version,
        reason: certificateRevisions.reason,
        createdBy: certificateRevisions.createdBy,
        displayName: appUsers.displayName,
        createdAt: certificateRevisions.createdAt,
      })
      .from(certificateRevisions)
      .leftJoin(appUsers, eq(certificateRevisions.createdBy, appUsers.id))
      .where(eq(certificateRevisions.certificateId, certId))
      .orderBy(sql`${certificateRevisions.version} desc`);

    const activities = await db
      .select({
        id: activityEvents.id,
        action: activityEvents.action,
        summary: activityEvents.summary,
        displayName: appUsers.displayName,
        createdAt: activityEvents.createdAt,
      })
      .from(activityEvents)
      .leftJoin(appUsers, eq(activityEvents.actorId, appUsers.id))
      .where(sql`${activityEvents.entityType} = 'certificate' and ${activityEvents.entityId} = ${certId}`)
      .orderBy(sql`${activityEvents.createdAt} desc`)
      .limit(50);

    return json({ data: { ...cert, revisions, activities }, requestId });
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
    const certId = params.certId as string;

    const [existing] = await db
      .select({ id: certificates.id, status: certificates.status, verificationCode: certificates.verificationCode })
      .from(certificates)
      .where(eq(certificates.id, certId));

    if (!existing) {
      return json({ error: { code: "not_found", message: "Certificate not found" }, requestId }, { status: 404 });
    }

    const body = (await readJson(request)) as Record<string, unknown>;
    const activityId = crypto.randomUUID();

    // Handle status transitions
    if (body.status === "issued") {
      const input = issueCertificateInput.parse(body);
      const snapshot = {
        certificateNumber: existing.verificationCode,
        issuedAt: new Date().toISOString(),
        issuedBy: user.id,
      };
      const [currentVersion] = await db
        .select({ v: sql<number>`COALESCE(max(${certificateRevisions.version}), 0)::int` })
        .from(certificateRevisions)
        .where(eq(certificateRevisions.certificateId, certId));
      const nextVersion = currentVersion.v + 1;

      const [updated] = await db.batch([
        db
          .update(certificates)
          .set({ status: "issued", updatedAt: new Date() })
          .where(eq(certificates.id, certId))
          .returning(),
        db.insert(certificateRevisions).values({
          id: crypto.randomUUID(),
          certificateId: certId,
          version: nextVersion,
          snapshot,
          reason: "Certificate issued",
          createdBy: user.id,
        }),
        db.insert(activityEvents).values({
          id: activityId,
          actorId: user.id,
          action: "certificate.issued",
          entityType: "certificate",
          entityId: certId,
          summary: `Issued certificate ${existing.verificationCode}`,
          requestId,
        }),
      ]);
      return json({ data: updated[0], requestId });
    }

    if (body.status === "revoked") {
      if (existing.status !== "issued" && existing.status !== "reissued") {
        return json(
          {
            error: { code: "invalid_transition", message: "Only issued certificates can be revoked" },
            requestId,
          },
          { status: 409 },
        );
      }
      const input = revokeCertificateInput.parse(body);
      const [updated] = await db.batch([
        db
          .update(certificates)
          .set({ status: "revoked", revokedReason: input.revokedReason, updatedAt: new Date() })
          .where(eq(certificates.id, certId))
          .returning(),
        db.insert(activityEvents).values({
          id: activityId,
          actorId: user.id,
          action: "certificate.revoked",
          entityType: "certificate",
          entityId: certId,
          summary: `Revoked certificate: ${input.revokedReason}`,
          requestId,
        }),
      ]);
      return json({ data: updated[0], requestId });
    }

    if (body.status === "reissued") {
      if (existing.status !== "revoked") {
        return json(
          {
            error: { code: "invalid_transition", message: "Only revoked certificates can be reissued" },
            requestId,
          },
          { status: 409 },
        );
      }
      const input = reissueCertificateInput.parse(body);
      const [currentVersion] = await db
        .select({ v: sql<number>`COALESCE(max(${certificateRevisions.version}), 0)::int` })
        .from(certificateRevisions)
        .where(eq(certificateRevisions.certificateId, certId));
      const nextVersion = currentVersion.v + 1;
      const snapshot = {
        reissuedAt: new Date().toISOString(),
        reissuedBy: user.id,
        reason: input.reason,
      };

      const [updated] = await db.batch([
        db
          .update(certificates)
          .set({ status: "reissued", updatedAt: new Date() })
          .where(eq(certificates.id, certId))
          .returning(),
        db.insert(certificateRevisions).values({
          id: crypto.randomUUID(),
          certificateId: certId,
          version: nextVersion,
          snapshot,
          reason: `Reissued: ${input.reason}`,
          createdBy: user.id,
        }),
        db.insert(activityEvents).values({
          id: activityId,
          actorId: user.id,
          action: "certificate.reissued",
          entityType: "certificate",
          entityId: certId,
          summary: `Reissued certificate: ${input.reason}`,
          requestId,
        }),
      ]);
      return json({ data: updated[0], requestId });
    }

    // Regular field update (for draft certificates)
    const input = updateCertificateInput.parse(body);
    const [updated] = await db.batch([
      db
        .update(certificates)
        .set({
          ...input,
          weightGrams: input.weightGrams?.toString(),
          completionDate: input.completionDate ? new Date(input.completionDate) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(certificates.id, certId))
        .returning(),
      db.insert(activityEvents).values({
        id: activityId,
        actorId: user.id,
        action: "certificate.updated",
        entityType: "certificate",
        entityId: certId,
        summary: `Updated certificate details`,
        after: input as unknown as Record<string, unknown>,
        requestId,
      }),
    ]);

    return json({ data: updated[0], requestId });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
