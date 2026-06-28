import { and, desc, eq, sql } from "drizzle-orm";
import {
  activityEvents,
  catalogPieces,
  certificates,
  certificateRevisions,
  clients,
  projects,
} from "../../../src/server/db/schema";
import {
  createCertificateInput,
  updateCertificateInput,
  issueCertificateInput,
  revokeCertificateInput,
  reissueCertificateInput,
} from "../../../src/server/trust/input";
import { requireUser } from "../../_shared/auth";
import { createDatabase } from "../../_shared/db";
import { parseServerEnv, type Env } from "../../_shared/env";
import { errorResponse, getRequestId, json, readJson } from "../../_shared/http";

function generateCertificateNumber(): string {
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `SC-${seq}`;
}

function generateVerificationCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const requestId = getRequestId(request);
  try {
    const serverEnv = parseServerEnv(env);
    const db = createDatabase(serverEnv.DATABASE_URL);
    await requireUser(request, serverEnv, db);

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const pieceId = url.searchParams.get("pieceId");
    const clientId = url.searchParams.get("clientId");
    const projectId = url.searchParams.get("projectId");
    const search = url.searchParams.get("search");
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);

    const conditions = [];
    if (status) conditions.push(eq(certificates.status, status as never));
    if (pieceId) conditions.push(eq(certificates.catalogPieceId, pieceId));
    if (clientId) conditions.push(eq(certificates.clientId, clientId));
    if (projectId) conditions.push(eq(certificates.projectId, projectId));
    if (search) {
      conditions.push(
        sql`(${certificates.certificateNumber} ilike ${`%${search}%`} or ${certificates.pieceName} ilike ${`%${search}%`})`,
      );
    }
    const where = and(...conditions);

    const [rows, [{ count }]] = await db.batch([
      db
        .select()
        .from(certificates)
        .leftJoin(clients, eq(certificates.clientId, clients.id))
        .leftJoin(projects, eq(certificates.projectId, projects.id))
        .where(where)
        .orderBy(desc(certificates.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(certificates).where(where),
    ]);

    const records = rows.map((r) => ({
      id: r.certificates.id,
      certificateNumber: r.certificates.certificateNumber,
      catalogPieceId: r.certificates.catalogPieceId,
      pieceName: r.certificates.pieceName,
      clientId: r.certificates.clientId,
      clientName: r.clients?.name ?? null,
      projectId: r.certificates.projectId,
      projectName: r.projects?.title ?? null,
      status: r.certificates.status,
      metalType: r.certificates.metalType,
      karat: r.certificates.karat,
      stoneSpecifications: r.certificates.stoneSpecifications,
      completionDate: r.certificates.completionDate,
      verificationCode: r.certificates.status === 'issued' || r.certificates.status === 'reissued' ? r.certificates.verificationCode : null,
      createdAt: r.certificates.createdAt,
    }));

    return json({ data: records, pagination: { limit, offset, total: count }, requestId });
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
    const input = createCertificateInput.parse(await readJson(request));

    const certId = crypto.randomUUID();
    const activityId = crypto.randomUUID();
    const verificationCode = generateVerificationCode();

    let certNumber = generateCertificateNumber();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db
        .select({ id: certificates.id })
        .from(certificates)
        .where(eq(certificates.certificateNumber, certNumber))
        .limit(1);
      if (existing.length === 0) break;
      certNumber = generateCertificateNumber();
      attempts++;
    }

    const [createdRows] = await db.batch([
      db
        .insert(certificates)
        .values({
          id: certId,
          projectId: input.projectId || undefined,
          certificateNumber: certNumber,
          catalogPieceId: input.catalogPieceId || undefined,
          clientId: input.clientId || undefined,
          pieceName: input.pieceName,
          metalType: input.metalType,
          karat: input.karat,
          stoneSpecifications: input.stoneSpecifications,
          weightGrams: input.weightGrams?.toString(),
          dimensions: input.dimensions,
          completionDate: input.completionDate ? new Date(input.completionDate) : undefined,
          careGuidance: input.careGuidance,
          signatory: input.signatory,
          verificationCode,
          notes: input.notes,
          createdBy: user.id,
        })
        .returning(),
      db.insert(activityEvents).values({
        id: activityId,
        actorId: user.id,
        action: "certificate.created",
        entityType: "certificate",
        entityId: certId,
        summary: `Created certificate ${certNumber} for "${input.pieceName}"`,
        after: input as unknown as Record<string, unknown>,
        requestId,
      }),
    ]);

    return json({ data: createdRows[0], requestId }, { status: 201 });
  } catch (error) {
    return errorResponse(error, requestId);
  }
};
