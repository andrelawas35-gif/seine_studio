import { useEffect, useState } from "react";
import { AlertTriangle, Cloud, CloudOff, RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
import { useOutbox } from "../useOutbox";
import { useToast } from "./Toast";

const DATABASE_MODE = import.meta.env.VITE_DATA_MODE === "api";

export function SyncStatus() {
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  const { total, pending, conflicts, failed, entries, syncing, syncNow, retry, discard } = useOutbox();
  const { toast } = useToast();

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!DATABASE_MODE) return null;

  async function synchronize() {
    const result = await syncNow();
    if (!result) {
      toast.warning("Still offline", "Queued changes remain safely on this device.");
      return;
    }
    if (result.conflicts) toast.warning("Review required", `${result.conflicts} queued change${result.conflicts === 1 ? " has" : "s have"} a conflict.`);
    else if (result.failed) toast.error("Sync incomplete", `${result.failed} change${result.failed === 1 ? "" : "s"} could not be sent.`);
    else toast.success("Workspace synced", `${result.sent} queued change${result.sent === 1 ? "" : "s"} sent.`);
  }

  const label = !online ? "Offline" : conflicts ? `${conflicts} conflict${conflicts === 1 ? "" : "s"}` : total ? `${total} queued` : "Synced";

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="inline-flex min-h-9 items-center gap-2 border border-border bg-card px-2.5 text-[9px] uppercase tracking-wider text-muted-foreground">
        {!online ? <CloudOff size={13} className="text-amber-700" /> : conflicts || failed ? <AlertTriangle size={13} className="text-amber-700" /> : <Cloud size={13} className="text-accent" />}
        <span className="hidden sm:inline">{label}</span>
        {total > 0 && <span className="grid h-4 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[10px] leading-none text-background">{total}</span>}
      </button>

      {open && (
        <section role="dialog" aria-label="Sync status" className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] border border-border bg-card p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
            <div>
              <p className="font-serif text-base text-foreground">Sync status</p>
              <p className="mt-1 text-[9px] text-muted-foreground">Changes are sent only when you choose Sync now.</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close sync status" className="grid min-h-9 min-w-9 place-items-center text-muted-foreground"><X size={14} /></button>
          </div>

          <div className="grid grid-cols-3 gap-2 py-3 text-center">
            <StatusCount label="Queued" value={pending} />
            <StatusCount label="Conflicts" value={conflicts} warning />
            <StatusCount label="Failed" value={failed} warning />
          </div>

          {entries.length > 0 && (
            <div className="max-h-48 space-y-2 overflow-auto border-y border-border py-3">
              {entries.map((entry) => (
                <div key={entry.id} className="border border-border bg-background p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[9px] text-foreground">{entry.method} {entry.path}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{entry.status} · {entry.attempts} attempt{entry.attempts === 1 ? "" : "s"}</p>
                      {entry.lastError && <p className="mt-1 text-[9px] text-red-700">{entry.lastError}</p>}
                    </div>
                    <div className="flex">
                      {(entry.status === "conflict" || entry.status === "failed") && <button type="button" onClick={() => void retry(entry.id)} aria-label="Retry queued change" className="grid min-h-9 min-w-9 place-items-center text-muted-foreground"><RotateCcw size={12} /></button>}
                      <button type="button" onClick={() => void discard(entry.id)} aria-label="Discard queued change" className="grid min-h-9 min-w-9 place-items-center text-muted-foreground"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={() => void synchronize()} disabled={syncing || !total} className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-foreground px-4 text-[9px] uppercase tracking-[0.16em] text-background disabled:opacity-40">
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing" : "Sync now"}
          </button>
        </section>
      )}
    </div>
  );
}

function StatusCount({ label, value, warning = false }: { label: string; value: number; warning?: boolean }) {
  return <div className="border border-border p-2"><p className={`font-serif text-lg ${warning && value ? "text-amber-800" : "text-foreground"}`}>{value}</p><p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p></div>;
}
