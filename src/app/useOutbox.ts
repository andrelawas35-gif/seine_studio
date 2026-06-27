import { useCallback, useEffect, useRef, useState } from "react";
import {
  discardOutboxEntry,
  enqueue,
  flushOutbox,
  getOutboxEntries,
  getOutboxSummary,
  OUTBOX_CHANGED_EVENT,
  retryOutboxEntry,
  type OutboxEntry,
  type OutboxFlushResult,
  type OutboxSummary,
} from "./db";
import { apiRequest } from "./api";

async function sendEntry(entry: OutboxEntry): Promise<void> {
  const init: RequestInit = { method: entry.method };
  if (entry.body) {
    init.body = entry.body;
    init.headers = { "content-type": "application/json" };
  }
  await apiRequest(entry.path, init);
}

export function useOutbox() {
  const [summary, setSummary] = useState<OutboxSummary>({ pending: 0, conflicts: 0, failed: 0 });
  const [entries, setEntries] = useState<OutboxEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => {
    const [nextSummary, nextEntries] = await Promise.all([getOutboxSummary(), getOutboxEntries()]);
    setSummary(nextSummary);
    setEntries(nextEntries);
  }, []);

  useEffect(() => {
    void refresh();
    const handleChange = () => void refresh();
    window.addEventListener(OUTBOX_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(OUTBOX_CHANGED_EVENT, handleChange);
  }, [refresh]);

  const add = useCallback(async (
    method: OutboxEntry["method"],
    path: string,
    body: Record<string, unknown> | null,
  ) => {
    await enqueue(method, path, body);
    await refresh();
  }, [refresh]);

  const flush = useCallback(async (): Promise<OutboxFlushResult | null> => {
    if (syncingRef.current || !navigator.onLine) return null;
    syncingRef.current = true;
    setSyncing(true);
    try {
      return await flushOutbox(sendEntry);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      await refresh();
    }
  }, [refresh]);

  const retry = useCallback(async (id: string) => {
    await retryOutboxEntry(id);
    await refresh();
  }, [refresh]);

  const discard = useCallback(async (id: string) => {
    await discardOutboxEntry(id);
    await refresh();
  }, [refresh]);

  return {
    ...summary,
    total: summary.pending + summary.conflicts + summary.failed,
    entries,
    syncing,
    add,
    syncNow: flush,
    retry,
    discard,
    refresh,
  };
}
