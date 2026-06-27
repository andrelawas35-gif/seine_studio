import type { ReactNode } from "react";
import { cn } from "./utils";

export interface ColumnDef<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  /** Hide this column in the mobile card layout */
  hideOnMobile?: boolean;
}

export interface MobileCardDef<T> {
  /** Primary line (e.g. name, title) */
  title: (row: T) => ReactNode;
  /** Secondary line (e.g. client, code) */
  subtitle?: (row: T) => ReactNode;
  /** Badge/pill shown inline */
  badge?: (row: T) => ReactNode;
  /** Right-aligned values (e.g. price, date) */
  trailing?: (row: T) => ReactNode;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  mobile: MobileCardDef<T>;
  keyFn: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

export function ResponsiveTable<T>({
  data,
  columns,
  mobile,
  keyFn,
  onRowClick,
  emptyMessage = "No records found.",
  className,
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <p className="border border-dashed border-border p-8 text-center text-[12px] text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={cn("bg-card border border-border rounded", className)}>
      {/* Mobile: stacked card rows */}
      <div className="sm:hidden divide-y divide-border">
        {data.map((row) => (
          <div
            key={keyFn(row)}
            className={cn(
              "px-4 py-3 flex items-start justify-between gap-3",
              onRowClick && "cursor-pointer active:bg-muted/30",
            )}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">
                {mobile.title(row)}
              </p>
              {mobile.subtitle && (
                <p className="text-[12px] text-muted-foreground truncate">
                  {mobile.subtitle(row)}
                </p>
              )}
              {mobile.badge && <div className="mt-1.5">{mobile.badge(row)}</div>}
            </div>
            {mobile.trailing && (
              <div className="text-right flex-shrink-0">
                {mobile.trailing(row)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: full table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-5 py-2.5 text-left text-[11px] tracking-[0.12em] uppercase text-muted-foreground font-medium",
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={keyFn(row)}
                className={cn(
                  "border-b border-border last:border-0 hover:bg-muted/20 transition-colors",
                  onRowClick && "cursor-pointer",
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-5 py-3", col.cellClassName)}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ResponsiveTableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="bg-card border border-border rounded">
      {/* Mobile skeleton */}
      <div className="sm:hidden divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <div className="h-3.5 w-3/4 rounded bg-[#EDE5D5] animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-[#EDE5D5] animate-pulse" />
            </div>
            <div className="h-3.5 w-16 rounded bg-[#EDE5D5] animate-pulse" />
          </div>
        ))}
      </div>
      {/* Desktop skeleton */}
      <div className="hidden sm:block">
        <div className="px-5 py-2.5 border-b border-border flex gap-5">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="h-3 flex-1 rounded bg-[#EDE5D5] animate-pulse" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 py-3.5 border-b border-border last:border-0 flex gap-5">
            {Array.from({ length: columns }).map((_, j) => (
              <div key={j} className="h-3.5 flex-1 rounded bg-[#EDE5D5] animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
