import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { apiRequest, ApiError } from "../../api";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { cn } from "./utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PieceOption {
  value: string;
  label: string;
  sku: string;
  category: string;
  retailPriceCents: number | null;
}

interface PiecePickerProps {
  value: string;
  onValueChange: (value: string, piece?: PieceOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  "aria-label"?: string;
  className?: string;
}

const USE_API = import.meta.env.VITE_DATA_MODE === "api";

// ─── Component ───────────────────────────────────────────────────────────────

export function PiecePicker({
  value,
  onValueChange,
  placeholder = "Select piece…",
  searchPlaceholder = "Search by SKU or name…",
  emptyMessage = "No pieces found.",
  "aria-label": ariaLabel,
  className,
}: PiecePickerProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<PieceOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((o) => o.value === value);
  const fetchedRef = useRef(false);

  const fetchOptions = useCallback(
    async (q?: string) => {
      if (!USE_API) return;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q) params.set("q", q);
        params.set("limit", "25");
        const res = await apiRequest<{ data: Array<{ id: string; sku: string; name: string; category: string; retailPriceCents: number | null }> }>(
          `/catalog?${params}`,
        );
        setOptions(
          res.data.map((p) => ({
            value: p.id,
            label: p.name,
            sku: p.sku,
            category: p.category,
            retailPriceCents: p.retailPriceCents,
          })),
        );
      } catch {
        // Silently fail — the combobox will show empty state
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Fetch initial options on first open
  useEffect(() => {
    if (open && !fetchedRef.current) {
      fetchedRef.current = true;
      void fetchOptions();
    }
  }, [open, fetchOptions]);

  // Re-fetch when search changes
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => void fetchOptions(search), 200);
      return () => clearTimeout(timer);
    }
  }, [search, open, fetchOptions]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel ?? placeholder}
          className={cn(
            "flex items-center justify-between gap-1.5 h-9 min-w-[160px] px-3 text-[13px] border border-border bg-transparent hover:border-accent/40 transition-colors",
            className,
          )}
        >
          <span
            className="truncate"
            style={{ color: selected ? "var(--foreground)" : "var(--ink-muted)" }}
          >
            {selected ? `${selected.sku} — ${selected.label}` : placeholder}
          </span>
          <ChevronsUpDown size={13} style={{ color: "var(--ink-muted)" }} className="flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={16} className="animate-spin" style={{ color: "var(--ink-muted)" }} />
              </div>
            )}
            {!loading && (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}
            {!loading && options.length > 0 && (
              <CommandGroup>
                {options.map((piece) => (
                  <CommandItem
                    key={piece.value}
                    value={piece.label}
                    onSelect={() => {
                      onValueChange(piece.value, piece);
                      setOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Check
                        size={14}
                        className={cn(
                          "flex-shrink-0",
                          value === piece.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-[11px] tracking-wider flex-shrink-0"
                            style={{ color: "var(--ink-muted)" }}
                          >
                            {piece.sku}
                          </span>
                          <span className="text-[13px] truncate">{piece.label}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-[10px] px-1 py-px border border-border"
                            style={{ color: "var(--ink-muted)" }}
                          >
                            {piece.category}
                          </span>
                          {piece.retailPriceCents != null && (
                            <span
                              className="font-mono text-[10px]"
                              style={{ color: "var(--ink-muted)" }}
                            >
                              ₱{(piece.retailPriceCents / 100).toLocaleString("en-PH")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
