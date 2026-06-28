/**
 * signals.ts — the shared selector module (ADR 0005 D-UI-4).
 *
 * One definition of every "urgency" calculation, as pure functions over minimal
 * structural inputs. The Overview composes them (and `rankAttention` feeds the
 * bounded top-3 "Today" surface, ADR 0008 D-ADHD-2); individual list pages reuse
 * the same selector so "overdue"/"low stock" mean the same thing everywhere.
 *
 * Rules honoured here:
 *  - Pure functions, no I/O, no fetching (guardrail G7).
 *  - Operate on derived/record fields only — never fixture-only `price`/`totalSpent`.
 *  - Date comparisons are date-only in Asia/Manila (the studio's business
 *    timezone) so a UTC server never drifts an "overdue" by a day.
 *
 * Inputs are minimal `*Like` shapes: any record carrying these fields satisfies
 * them, so the module is decoupled from the full record types in projects.ts /
 * clients.ts / the page-local lite shapes.
 */

import type { Severity } from "./statusSeverity";

// ─── Manila date helpers ────────────────────────────────────────────────────

/** A calendar date as `YYYY-MM-DD`. Comparable lexicographically. */
export type IsoDate = string;

/** Today's date in Asia/Manila as `YYYY-MM-DD`. */
export function manilaToday(now: Date = new Date()): IsoDate {
  // en-CA renders ISO-style YYYY-MM-DD; the timeZone option does the shift.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Normalise any ISO timestamp/date string to its Manila calendar date. */
export function toManilaDate(value: string): IsoDate {
  return manilaToday(new Date(value));
}

/** Whole days from `a` to `b` (b - a), date-only. Negative if b is before a. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

// ─── Minimal input shapes ───────────────────────────────────────────────────

export interface InvoiceLike {
  id: string;
  invoiceNumber?: string | null;
  clientName?: string | null;
  status: string;
  dueDate: string | null;
}

export interface QuoteLike {
  id: string;
  quoteNumber?: string | null;
  clientName?: string | null;
  status: string;
  /** When the quote stops being valid. Field name varies by source — map it here. */
  expiresAt: string | null;
}

export interface ProjectLike {
  id: string;
  title: string;
  clientName?: string | null;
  stage: string;
  targetDate: string | null;
}

export interface RepairLike {
  id: string;
  ticketNumber?: string | null;
  clientName?: string | null;
  pieceDescription?: string | null;
  status: string;
  promisedDate: string | null;
}

export interface StockLike {
  id: string;
  label?: string | null;
  onHand: number;
  reorderLevel: number;
}

// ─── Status sets (what counts as "still open / actionable") ──────────────────

const PAID_OR_CLOSED_INVOICE = new Set(["paid", "void", "voided", "refunded"]);
const OPEN_QUOTE = new Set(["sent", "viewed"]);
const CLOSED_REPAIR = new Set(["released", "cancelled", "canceled"]);
/** Active project stages (terminal/closed stages are excluded from deadlines). */
const ACTIVE_PROJECT_STAGES = new Set([
  "inquiry",
  "design",
  "approved",
  "production",
  "quality_control",
  "ready",
]);

const DEFAULT_SOON_DAYS = 7;

// ─── Selectors ──────────────────────────────────────────────────────────────

export function overdueInvoices(invoices: InvoiceLike[], today: IsoDate = manilaToday()): InvoiceLike[] {
  return invoices.filter(
    (inv) =>
      !PAID_OR_CLOSED_INVOICE.has(inv.status) &&
      inv.dueDate != null &&
      daysBetween(today, toManilaDate(inv.dueDate)) < 0,
  );
}

export function expiringQuotes(
  quotes: QuoteLike[],
  today: IsoDate = manilaToday(),
  withinDays = DEFAULT_SOON_DAYS,
): QuoteLike[] {
  return quotes.filter((q) => {
    if (!OPEN_QUOTE.has(q.status) || q.expiresAt == null) return false;
    const days = daysBetween(today, toManilaDate(q.expiresAt));
    return days >= 0 && days <= withinDays;
  });
}

export function overdueProjects(projects: ProjectLike[], today: IsoDate = manilaToday()): ProjectLike[] {
  return projects.filter(
    (p) =>
      ACTIVE_PROJECT_STAGES.has(p.stage) &&
      p.targetDate != null &&
      daysBetween(today, toManilaDate(p.targetDate)) < 0,
  );
}

export function dueSoonProjects(
  projects: ProjectLike[],
  today: IsoDate = manilaToday(),
  withinDays = DEFAULT_SOON_DAYS,
): ProjectLike[] {
  return projects.filter((p) => {
    if (!ACTIVE_PROJECT_STAGES.has(p.stage) || p.targetDate == null) return false;
    const days = daysBetween(today, toManilaDate(p.targetDate));
    return days >= 0 && days <= withinDays;
  });
}

export function pastPromiseRepairs(repairs: RepairLike[], today: IsoDate = manilaToday()): RepairLike[] {
  return repairs.filter(
    (r) =>
      !CLOSED_REPAIR.has(r.status) &&
      r.promisedDate != null &&
      daysBetween(today, toManilaDate(r.promisedDate)) < 0,
  );
}

export function lowStock(items: StockLike[]): StockLike[] {
  // reorderLevel 0 means "no threshold set" — never flag those.
  return items.filter((i) => i.reorderLevel > 0 && i.onHand <= i.reorderLevel);
}

// ─── Attention ranking (feeds the bounded "Today" surface) ───────────────────

export type AttentionKind =
  | "invoice_overdue"
  | "project_overdue"
  | "repair_overdue"
  | "quote_expiring"
  | "project_due_soon"
  | "low_stock";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  severity: Severity;
  /** Action-framed, not an alarm tag (ADR 0008 D-ADHD-2). */
  label: string;
  sublabel?: string;
  href: string;
  /** Lower sorts first. Derived from severity + how overdue/soon. */
  rank: number;
}

export interface AttentionSources {
  invoices?: InvoiceLike[];
  projects?: ProjectLike[];
  repairs?: RepairLike[];
  quotes?: QuoteLike[];
  stock?: StockLike[];
}

/** Severity weights — red items always rank above amber. */
const SEVERITY_WEIGHT: Record<Severity, number> = { red: 0, amber: 1000, neutral: 2000 };

/**
 * Build a single prioritised attention list from all sources. Red (overdue)
 * before amber (soon), and within a tier the most overdue / soonest first.
 * The caller (Overview "Today") slices the top 3 and collapses the rest — this
 * function does NOT cap, so list pages can reuse the full ranking.
 */
export function rankAttention(sources: AttentionSources, today: IsoDate = manilaToday()): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const inv of overdueInvoices(sources.invoices ?? [], today)) {
    const overdueBy = -daysBetween(today, toManilaDate(inv.dueDate!));
    items.push({
      id: `invoice-${inv.id}`,
      kind: "invoice_overdue",
      severity: "red",
      label: `${inv.clientName ?? inv.invoiceNumber ?? "Invoice"}'s payment is overdue`,
      sublabel: inv.invoiceNumber ?? undefined,
      href: `/invoices/${inv.id}`,
      rank: SEVERITY_WEIGHT.red - overdueBy,
    });
  }

  for (const p of overdueProjects(sources.projects ?? [], today)) {
    const overdueBy = -daysBetween(today, toManilaDate(p.targetDate!));
    items.push({
      id: `project-${p.id}`,
      kind: "project_overdue",
      severity: "red",
      label: `${p.title} is past its target date`,
      sublabel: p.clientName ?? undefined,
      href: `/projects/${p.id}`,
      rank: SEVERITY_WEIGHT.red - overdueBy,
    });
  }

  for (const r of pastPromiseRepairs(sources.repairs ?? [], today)) {
    const overdueBy = -daysBetween(today, toManilaDate(r.promisedDate!));
    items.push({
      id: `repair-${r.id}`,
      kind: "repair_overdue",
      severity: "red",
      label: `${r.ticketNumber ?? "Repair"} is past its promised date`,
      sublabel: r.clientName ?? r.pieceDescription ?? undefined,
      href: `/repairs/${r.id}`,
      rank: SEVERITY_WEIGHT.red - overdueBy,
    });
  }

  for (const q of expiringQuotes(sources.quotes ?? [], today)) {
    const inDays = daysBetween(today, toManilaDate(q.expiresAt!));
    items.push({
      id: `quote-${q.id}`,
      kind: "quote_expiring",
      severity: "amber",
      label: `${q.clientName ?? q.quoteNumber ?? "Quote"}'s quote expires soon`,
      sublabel: q.quoteNumber ?? undefined,
      href: `/quotes/${q.id}`,
      rank: SEVERITY_WEIGHT.amber + inDays,
    });
  }

  for (const p of dueSoonProjects(sources.projects ?? [], today)) {
    const inDays = daysBetween(today, toManilaDate(p.targetDate!));
    items.push({
      id: `project-soon-${p.id}`,
      kind: "project_due_soon",
      severity: "amber",
      label: `${p.title} is due soon`,
      sublabel: p.clientName ?? undefined,
      href: `/projects/${p.id}`,
      rank: SEVERITY_WEIGHT.amber + inDays,
    });
  }

  for (const s of lowStock(sources.stock ?? [])) {
    items.push({
      id: `stock-${s.id}`,
      kind: "low_stock",
      severity: "amber",
      label: `${s.label ?? "An item"} is low on stock`,
      sublabel: `${s.onHand} on hand`,
      href: `/inventory/${s.id}`,
      rank: SEVERITY_WEIGHT.amber + 1,
    });
  }

  return items.sort((a, b) => a.rank - b.rank);
}
