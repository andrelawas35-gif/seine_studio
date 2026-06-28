import { useEffect, useState } from "react";
import { RefreshCw, WifiOff, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

export function PwaStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  if (online && !offlineReady && !needRefresh) return null;

  const dismiss = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <aside
      aria-live="polite"
      className="fixed left-1/2 top-3 z-50 flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 items-center gap-3 border border-border bg-card px-3 py-2 shadow-lg"
    >
      {!online ? (
        <WifiOff size={15} className="shrink-0 text-amber-700" />
      ) : (
        <RefreshCw size={15} className="shrink-0 text-accent" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-foreground">
          {!online ? "You are offline" : needRefresh ? "Update available" : "Ready for offline use"}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {!online
            ? "Previously loaded screens remain available. Financial changes still require a connection."
            : needRefresh
              ? "Refresh when you are ready. Unsaved form work should be completed first."
              : "The application shell has been saved on this device."}
        </p>
      </div>
      {needRefresh && (
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="min-h-9 border border-foreground bg-foreground px-3 text-[11px] font-medium text-card"
        >
          Refresh
        </button>
      )}
      {online && (
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="min-h-9 min-w-9 grid place-items-center text-muted-foreground">
          <X size={14} />
        </button>
      )}
    </aside>
  );
}
