import Dexie, { type EntityTable } from "dexie";

export interface Draft {
  id: string;
  entity: string;
  values: Record<string, unknown>;
  updatedAt: string;
}

export interface OutboxEntry {
  id: string;
  method: "POST" | "PATCH" | "DELETE";
  path: string;
  body: string | null;
  createdAt: string;
  attempts: number;
  lastError: string | null;
  status: "pending" | "syncing" | "conflict" | "failed";
  updatedAt: string;
}

export interface OutboxSummary {
  pending: number;
  conflicts: number;
  failed: number;
}

export interface OutboxFlushResult {
  sent: number;
  failed: number;
  conflicts: number;
}

export const OUTBOX_CHANGED_EVENT = "seine:outbox-changed";

class SeineDB extends Dexie {
  drafts!: EntityTable<Draft, "id">;
  outbox!: EntityTable<OutboxEntry, "id">;

  constructor() {
    super("seine-studio");
    this.version(1).stores({
      drafts: "id, entity, updatedAt",
      outbox: "id, createdAt",
    });
    this.version(2)
      .stores({
        drafts: "id, entity, updatedAt",
        outbox: "id, status, createdAt, updatedAt",
      })
      .upgrade(async (transaction) => {
        await transaction
          .table<OutboxEntry, string>("outbox")
          .toCollection()
          .modify((entry) => {
            entry.status = entry.status ?? "pending";
            entry.updatedAt = entry.updatedAt ?? entry.createdAt;
          });
      });
  }
}

export const db = new SeineDB();

export async function saveDraft(entity: string, values: Record<string, unknown>): Promise<string> {
  const id = `draft-${entity}-${Date.now()}`;
  await db.drafts.put({
    id,
    entity,
    values,
    updatedAt: new Date().toISOString(),
  });
  return id;
}

export async function updateDraft(id: string, values: Record<string, unknown>): Promise<void> {
  await db.drafts.update(id, { values, updatedAt: new Date().toISOString() });
}

export async function getDrafts(entity: string): Promise<Draft[]> {
  return db.drafts.where("entity").equals(entity).reverse().sortBy("updatedAt");
}

export async function deleteDraft(id: string): Promise<void> {
  await db.drafts.delete(id);
}

export async function enqueue(
  method: OutboxEntry["method"],
  path: string,
  body: Record<string, unknown> | null,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.outbox.add({
    id,
    method,
    path,
    body: body ? JSON.stringify(body) : null,
    createdAt: now,
    attempts: 0,
    lastError: null,
    status: "pending",
    updatedAt: now,
  });
  notifyOutboxChanged();
  return id;
}

export async function flushOutbox(
  send: (entry: OutboxEntry) => Promise<void>,
): Promise<OutboxFlushResult> {
  const entries = await db.outbox
    .where("status")
    .anyOf("pending", "failed")
    .sortBy("createdAt");
  let sent = 0;
  let failed = 0;
  let conflicts = 0;
  for (const entry of entries) {
    await db.outbox.update(entry.id, { status: "syncing", updatedAt: new Date().toISOString() });
    try {
      await send(entry);
      await db.outbox.delete(entry.id);
      sent++;
    } catch (error) {
      const status = getErrorStatus(error);
      const conflict = status === 409 || status === 412;
      if (conflict) conflicts++;
      else failed++;
      await db.outbox.update(entry.id, {
        attempts: entry.attempts + 1,
        lastError: error instanceof Error ? error.message : "Unknown error",
        status: conflict ? "conflict" : "failed",
        updatedAt: new Date().toISOString(),
      });
    }
  }
  notifyOutboxChanged();
  return { sent, failed, conflicts };
}

export async function getOutboxEntries(): Promise<OutboxEntry[]> {
  return db.outbox.orderBy("createdAt").toArray();
}

export async function getOutboxSummary(): Promise<OutboxSummary> {
  const entries = await getOutboxEntries();
  return summarizeOutbox(entries);
}

export function summarizeOutbox(entries: OutboxEntry[]): OutboxSummary {
  return entries.reduce<OutboxSummary>(
    (summary, entry) => {
      if (entry.status === "conflict") summary.conflicts++;
      else if (entry.status === "failed") summary.failed++;
      else summary.pending++;
      return summary;
    },
    { pending: 0, conflicts: 0, failed: 0 },
  );
}

export async function retryOutboxEntry(id: string): Promise<void> {
  await db.outbox.update(id, { status: "pending", lastError: null, updatedAt: new Date().toISOString() });
  notifyOutboxChanged();
}

export async function discardOutboxEntry(id: string): Promise<void> {
  await db.outbox.delete(id);
  notifyOutboxChanged();
}

export async function clearAllLocalData(): Promise<void> {
  await db.drafts.clear();
  await db.outbox.clear();
  notifyOutboxChanged();
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("status" in error)) return undefined;
  return typeof error.status === "number" ? error.status : undefined;
}

function notifyOutboxChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OUTBOX_CHANGED_EVENT));
}
