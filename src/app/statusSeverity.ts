/**
 * Status severity — the one app-wide source of truth for "how loud is this
 * status?" (ADR 0008 D-ADHD-3).
 *
 * The ADHD lens (principle 3: calm by default, alarm earned and rare):
 *  - neutral — informational AND terminal states (draft, active, delivered,
 *              declined, cancelled, paid). Muted ink + a quiet dot, NO saturated
 *              colour. Most statuses live here. Terminal states are neutral, not
 *              red: "cancelled" is done, not on fire.
 *  - amber   — approaching / mild (due soon, low stock, below-target margin).
 *  - red     — genuinely time-critical / money-at-risk (overdue, past deadline).
 *
 * Built here in Phase 0; APPLIED across the pages in Phase 5 (F5.1). Do not
 * mass-migrate the existing per-page STATUS_* colour maps yet.
 */

export type Severity = "neutral" | "amber" | "red";

/** Entity buckets so the same status word can differ by context if ever needed. */
export type SeverityEntity =
  | "invoice"
  | "quote"
  | "project"
  | "repair"
  | "event"
  | "certificate"
  | "stock"
  | "generic";

/**
 * Statuses that are urgent regardless of entity. Kept deliberately small —
 * widening this set is how an app drifts back into constant alarm.
 */
const RED_STATUSES = new Set(["overdue", "past_due", "past_deadline"]);

/** Approaching / soft-warning statuses. */
const AMBER_STATUSES = new Set([
  "due_soon",
  "expiring",
  "low_stock",
  "below_target",
  "pending_action",
  "awaiting",
]);

/**
 * Everything else — including every terminal/closed state — is neutral. Listed
 * explicitly so a reviewer can see the intent: these must never render red.
 */
const EXPLICIT_NEUTRAL = new Set([
  "draft",
  "active",
  "open",
  "sent",
  "viewed",
  "accepted",
  "converted",
  "delivered",
  "ready",
  "released",
  "issued",
  "paid",
  "partially_paid",
  "complete",
  "completed",
  "declined",
  "cancelled",
  "canceled",
  "void",
  "voided",
  "expired",
  "refunded",
  "revoked",
  "in_stock",
]);

function normalize(status: string): string {
  return status.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}

/**
 * Map a raw status string to its severity tier. Unknown statuses default to
 * neutral — the safe, calm default. Pass an explicit `severity` from a signal
 * (see signals.ts) when urgency is derived rather than encoded in the status
 * word (e.g. an invoice is "sent" but past its due date).
 */
export function statusSeverity(
  _entity: SeverityEntity,
  status: string | null | undefined,
): Severity {
  if (!status) return "neutral";
  const s = normalize(status);
  if (RED_STATUSES.has(s)) return "red";
  if (AMBER_STATUSES.has(s)) return "amber";
  // EXPLICIT_NEUTRAL is checked last only for documentation; the default is
  // already neutral, so any unlisted status is calm by construction.
  if (EXPLICIT_NEUTRAL.has(s)) return "neutral";
  return "neutral";
}

/** Tailwind token classes per tier — muted by default, never gold (reserved). */
export const SEVERITY_DOT_CLASS: Record<Severity, string> = {
  neutral: "bg-muted-foreground/40",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export const SEVERITY_PILL_CLASS: Record<Severity, string> = {
  neutral: "border-border text-muted-foreground",
  amber: "border-amber-300 text-amber-800 bg-amber-50",
  red: "border-red-300 text-red-800 bg-red-50",
};
