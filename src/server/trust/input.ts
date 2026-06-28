import { z } from "zod";

// ── Certificates ─────────────────────────────────────────────────────────

export const createCertificateInput = z.object({
  catalogPieceId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  pieceName: z.string().min(1, "Piece name is required").max(255),
  metalType: z.string().max(100).optional(),
  karat: z.string().max(50).optional(),
  stoneSpecifications: z.string().max(2000).optional(),
  weightGrams: z
    .union([z.number().positive(), z.string().transform((s) => Number(s))])
    .pipe(z.number().positive().max(9999999.999))
    .optional(),
  dimensions: z.string().max(500).optional(),
  completionDate: z.string().datetime().optional(),
  careGuidance: z.string().max(2000).optional(),
  signatory: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateCertificateInput = z.object({
  pieceName: z.string().min(1).max(255).optional(),
  catalogPieceId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  metalType: z.string().max(100).optional(),
  karat: z.string().max(50).optional(),
  stoneSpecifications: z.string().max(2000).optional(),
  weightGrams: z
    .union([z.number().positive(), z.string().transform((s) => Number(s))])
    .pipe(z.number().positive().max(9999999.999))
    .optional(),
  dimensions: z.string().max(500).optional(),
  completionDate: z.string().datetime().optional(),
  careGuidance: z.string().max(2000).optional(),
  signatory: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
});

export const issueCertificateInput = z.object({
  status: z.literal("issued"),
});

export const revokeCertificateInput = z.object({
  status: z.literal("revoked"),
  revokedReason: z.string().min(1, "Revocation reason is required").max(2000),
});

export const reissueCertificateInput = z.object({
  status: z.literal("reissued"),
  reason: z.string().min(1, "Reissue reason is required").max(2000),
});

// ── Repair Tickets ───────────────────────────────────────────────────────

export const createRepairInput = z.object({
  clientId: z.string().uuid("Client is required"),
  catalogPieceId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  pieceDescription: z.string().min(1, "Piece description is required").max(2000),
  identifyingMarks: z.string().max(2000).optional(),
  photosUrls: z.array(z.string().url()).max(20).optional(),
  receivedCondition: z.string().max(5000).optional(),
  includedAccessories: z.string().max(2000).optional(),
  requestedWork: z.string().min(1, "Requested work is required").max(5000),
  estimateCents: z.number().int().min(0).optional(),
  depositCents: z.number().int().min(0).default(0),
  promisedDate: z.string().datetime().optional(),
  currentLocationId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
});

export const updateRepairInput = z.object({
  pieceDescription: z.string().min(1).max(2000).optional(),
  catalogPieceId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  identifyingMarks: z.string().max(2000).optional(),
  photosUrls: z.array(z.string().url()).max(20).optional(),
  receivedCondition: z.string().max(5000).optional(),
  includedAccessories: z.string().max(2000).optional(),
  requestedWork: z.string().min(1).max(5000).optional(),
  estimateCents: z.number().int().min(0).optional(),
  depositCents: z.number().int().min(0).optional(),
  promisedDate: z.string().datetime().optional(),
  currentLocationId: z.string().uuid().optional(),
  releaseAcknowledgment: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
});

export const transitionRepairInput = z.object({
  status: z.enum([
    "assessed",
    "awaiting_approval",
    "in_service",
    "waiting_for_parts",
    "quality_check",
    "ready",
    "released",
    "cancelled",
  ]),
  notes: z.string().max(2000).optional(),
  locationId: z.string().uuid().optional(),
});
