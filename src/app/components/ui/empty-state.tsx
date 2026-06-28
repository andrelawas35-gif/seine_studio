import type { ReactNode } from "react";
import { cn } from "./utils";

/**
 * EmptyState — the one shared empty-view primitive (ADR 0007 D-UX-3).
 *
 * Three variants force every call site to declare *which* empty it is — the
 * distinction the old hand-rolled empties got wrong (offering "create" when a
 * search returned nothing):
 *
 *  - `zero`      — no records exist yet. Encouragement + the page's canonical
 *                  primary action. Also the closure-state primitive reused in
 *                  Phase 1 ("You're all caught up").
 *  - `noResults` — a search/filter matched nothing. Neutral copy + Clear filters.
 *                  NEVER a create CTA.
 *  - `section`   — a connected-history 360 section is empty. Quiet one-liner.
 *
 * The component owns layout + calm tone (ADHD lens, ADR 0008); copy and actions
 * are passed in. Tailwind token classes only — no inline `var(--…)` (guardrail G5).
 */

type EmptyStateVariant = "zero" | "noResults" | "section";

interface EmptyStateProps {
  variant: EmptyStateVariant;
  /** Optional uppercase micro-label above the title (zero variant). */
  eyebrow?: string;
  /** The headline. For `section`, this is the whole quiet one-liner. */
  title: string;
  /** Supporting sentence. Omitted on `section` by default. */
  description?: string;
  /** Optional leading icon (zero variant reads best with one). */
  icon?: ReactNode;
  /**
   * The primary action. On `zero` this is the page's canonical create action
   * (e.g. "Create quote"). On `noResults` pass `onClearFilters` instead — a
   * create CTA here is a bug.
   */
  action?: ReactNode;
  /** noResults only: wire the Clear filters affordance. */
  onClearFilters?: () => void;
  clearLabel?: string;
  className?: string;
}

export function EmptyState({
  variant,
  eyebrow,
  title,
  description,
  icon,
  action,
  onClearFilters,
  clearLabel = "Clear filters",
  className,
}: EmptyStateProps) {
  if (variant === "section") {
    // Quiet, inline — a 360 section with nothing in it should whisper, not alarm.
    return (
      <p
        className={cn(
          "border border-dashed border-border rounded px-4 py-6 text-center text-[12px] text-muted-foreground/70",
          className,
        )}
      >
        {title}
        {action ? <span className="mt-3 block">{action}</span> : null}
      </p>
    );
  }

  const isZero = variant === "zero";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        isZero ? "px-6 py-12 sm:py-16" : "px-6 py-10",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 text-muted-foreground/60" aria-hidden="true">
          {icon}
        </div>
      ) : null}

      {isZero && eyebrow ? (
        <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}

      <p
        className={cn(
          isZero
            ? "font-serif text-lg text-foreground"
            : "text-[13px] font-medium text-foreground",
        )}
        style={isZero ? { fontFamily: "'Playfair Display', serif" } : undefined}
      >
        {title}
      </p>

      {description ? (
        <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}

      {variant === "noResults" && onClearFilters ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-4 min-h-9 px-3 text-[11px] uppercase tracking-[0.14em] text-accent hover:underline"
        >
          {clearLabel}
        </button>
      ) : null}

      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
