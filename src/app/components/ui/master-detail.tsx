import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { cn } from "./utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MasterDetailProps {
  /** Toolbar content (search input, filters, actions). Rendered above the sidebar. */
  toolbar?: ReactNode;
  /** Sidebar list children. Rendered inside the scrollable sidebar panel. */
  sidebar: ReactNode;
  /** Detail pane children. Rendered when a selection is active. */
  detail: ReactNode;
  /** Whether the sidebar is loading. Shows a centered spinner in place of children. */
  loading?: boolean;
  /** Error message. Shown in the sidebar in place of children. */
  error?: string | null;
  /** When true, shows emptyState instead of sidebar children (even if sidebar is non-null). */
  isEmpty?: boolean;
  /** Custom empty state for the sidebar. Defaults to a muted "No records" message. */
  emptyState?: ReactNode;
  /** Shown in the detail pane when no item is selected. */
  noSelectionPlaceholder?: ReactNode;
  /** Label for the mobile back-to-list button. Defaults to "Back to list". */
  backLabel?: string;
  /** Whether a selection is active — controls mobile list↔detail toggle. */
  hasSelection?: boolean;
  /** Called when the user taps the mobile back button (so the parent can clear selection). */
  onBack?: () => void;
  /** Optional header rendered above toolbar (title + create button row). */
  header?: ReactNode;
  /** Optional content rendered between toolbar and the sidebar+detail area. */
  belowToolbar?: ReactNode;
  /** Additional class for the root container. */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MasterDetail({
  toolbar,
  sidebar,
  detail,
  loading = false,
  error = null,
  isEmpty = false,
  emptyState,
  noSelectionPlaceholder,
  backLabel = "Back to list",
  hasSelection = false,
  onBack,
  header,
  belowToolbar,
  className,
}: MasterDetailProps) {
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const prevSelection = useRef(hasSelection);

  // Auto-switch to detail only when a selection is first made (rising edge).
  // When hasSelection goes false (cleared), go back to list.
  useEffect(() => {
    if (hasSelection && !prevSelection.current) {
      setMobileView("detail");
    } else if (!hasSelection) {
      setMobileView("list");
    }
    prevSelection.current = hasSelection;
  }, [hasSelection]);

  const showList = !hasSelection || mobileView === "list";
  const showDetail = hasSelection && mobileView === "detail";

  const handleBack = () => {
    setMobileView("list");
    onBack?.();
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header slot */}
      {header}

      {/* Toolbar slot */}
      {toolbar && (
        <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 border-b border-border bg-card">
          {toolbar}
        </div>
      )}

      {/* Below-toolbar slot (e.g. summary bar) */}
      {belowToolbar}

      {/* Content: sidebar + detail */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <div
          className={cn(
            "flex-col w-full md:w-80 lg:w-96 border-r border-border overflow-y-auto",
            showList ? "flex" : "hidden",
            "md:flex",
          )}
        >
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={18} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="p-4 text-[12px] text-destructive">{error}</div>
          )}

          {!loading && !error && isEmpty && (
            <div className="p-8 text-center">
              {emptyState || (
                <p className="text-[13px] text-muted-foreground">No records found.</p>
              )}
            </div>
          )}

          {!loading && !error && !isEmpty && sidebar}
        </div>

        {/* ── Detail ───────────────────────────────────────────────────── */}
        <div
          className={cn(
            "flex-1 flex-col overflow-y-auto",
            showDetail ? "flex" : "hidden",
            "md:flex",
          )}
        >
          {/* Mobile back button */}
          {hasSelection && (
            <button
              type="button"
              onClick={handleBack}
              className="md:hidden flex items-center gap-1 px-4 py-2 text-[12px] text-accent border-b border-border"
            >
              <ChevronLeft size={13} />
              {backLabel}
            </button>
          )}

          {!hasSelection && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              {noSelectionPlaceholder || (
                <p className="text-[13px]">Select an item to view details</p>
              )}
            </div>
          )}

          {hasSelection && detail}
        </div>
      </div>
    </div>
  );
}
