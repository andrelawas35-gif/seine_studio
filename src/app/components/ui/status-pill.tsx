import {
  statusSeverity,
  SEVERITY_DOT_CLASS,
  SEVERITY_PILL_CLASS,
  type Severity,
  type SeverityEntity,
} from "../../statusSeverity";
import { cn } from "./utils";

/**
 * StatusDot / StatusPill — the calm, muted-by-default status renderers
 * (ADR 0008 D-ADHD-3). Severity is resolved once via statusSeverity(); callers
 * may override it when urgency is *derived* (e.g. a "sent" invoice that is past
 * due — pass severity="red" from a signal).
 *
 * Tailwind token classes only (guardrail G5). Gold is never used here — it is a
 * reserved accent, not a status colour.
 */

interface StatusProps {
  status: string | null | undefined;
  /** Defaults to "generic"; pass the entity if a status word is context-sensitive. */
  entity?: SeverityEntity;
  /** Override the computed severity when urgency is derived, not encoded. */
  severity?: Severity;
  /** Human-readable label; defaults to the raw status, prettified. */
  label?: string;
  className?: string;
}

function prettify(status: string | null | undefined): string {
  if (!status) return "—";
  return status
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusDot({ status, entity = "generic", severity, className }: StatusProps) {
  const tier = severity ?? statusSeverity(entity, status);
  return (
    <span
      className={cn("inline-block h-1.5 w-1.5 rounded-full", SEVERITY_DOT_CLASS[tier], className)}
      aria-hidden="true"
    />
  );
}

export function StatusPill({ status, entity = "generic", severity, label, className }: StatusProps) {
  const tier = severity ?? statusSeverity(entity, status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium",
        SEVERITY_PILL_CLASS[tier],
        className,
      )}
    >
      <span className={cn("h-1 w-1 rounded-full", SEVERITY_DOT_CLASS[tier])} aria-hidden="true" />
      {label ?? prettify(status)}
    </span>
  );
}
