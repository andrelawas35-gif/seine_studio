import { type ReactNode, useRef } from "react";
import { Copy, Printer, Files } from "lucide-react";
import { SeineMark } from "./SeineMark";

// ─── Types ───────────────────────────────────────────────────────────────────

export type DocumentSize = "A4" | "US-Letter";

export interface DocumentMeta {
  /** Document type label (e.g. "Quote", "Invoice", "Certificate") */
  kind: string;
  /** Stable document number (e.g. "INV-2026-001") */
  number: string;
  /** Date displayed in the masthead */
  date: string;
  /** Optional secondary date (e.g. "Valid until") */
  dateLabel?: string;
  /** Expiry or secondary date */
  dateSecondary?: string;
  /** Seine Studio masthead line */
  masthead?: string;
}

interface DocumentCanvasProps {
  meta: DocumentMeta;
  /** Paper size, defaults to A4 */
  size?: DocumentSize;
  /** The document body content (line items, totals, notes) */
  children: ReactNode;
  /** Optional footer */
  footer?: ReactNode;
  /** Called with the full text content for clipboard copy */
  onCopy?: () => string;
  /** Called to duplicate the snapshot */
  onDuplicate?: () => void;
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE: Record<DocumentSize, { width: string; padding: string }> = {
  A4: { width: "210mm", padding: "18mm 15mm 20mm" },
  "US-Letter": { width: "8.5in", padding: "0.7in 0.6in 0.8in" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function DocumentCanvas({
  meta,
  size = "A4",
  children,
  footer,
  onCopy,
  onDuplicate,
  className = "",
}: DocumentCanvasProps) {
  const docRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => window.print();
  const handleCopy = () => {
    if (!onCopy) return;
    const text = onCopy();
    void navigator.clipboard.writeText(text);
  };
  const handleDuplicate = () => onDuplicate?.();

  const isA4 = size === "A4";

  return (
    <div className={`document-canvas-wrapper ${className}`}>
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="document-toolbar flex items-center gap-2 mb-4 px-1 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 min-h-9 px-3 border border-border bg-card text-[12px] text-foreground hover:border-accent/40 transition-colors"
        >
          <Printer size={13} className="text-muted-foreground" />
          Print
        </button>
        {onCopy && (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 min-h-9 px-3 border border-border bg-card text-[12px] text-foreground hover:border-accent/40 transition-colors"
          >
            <Copy size={13} className="text-muted-foreground" />
            Copy
          </button>
        )}
        {onDuplicate && (
          <button
            type="button"
            onClick={handleDuplicate}
            className="inline-flex items-center gap-1.5 min-h-9 px-3 border border-border bg-card text-[12px] text-foreground hover:border-accent/40 transition-colors"
          >
            <Files size={13} className="text-muted-foreground" />
            Duplicate
          </button>
        )}
      </div>

      {/* ── Page ─────────────────────────────────────────────────────────── */}
      <div
        ref={docRef}
        className="document-page bg-white text-[#17140F] shadow-lg print:shadow-none print:bg-white print:text-black"
        style={{
          maxWidth: PAGE[size].width,
          width: "100%",
          margin: "0 auto",
          padding: PAGE[size].padding,
          fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
          fontSize: "14px",
          lineHeight: 1.6,
        }}
      >
        {/* ── Masthead ─────────────────────────────────────────────────── */}
        <header className="document-masthead" style={{ marginBottom: isA4 ? "24px" : "20px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "24px" }}>
            {/* Left: Brand mark */}
            <div style={{ flexShrink: 0 }}>
              <SeineMark size={28} style={{ color: "#17140F" }} />
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "16px",
                  fontWeight: 500,
                  marginTop: "8px",
                  color: "#17140F",
                  letterSpacing: "0.02em",
                }}
              >
                Seine Studio
              </p>
              {meta.masthead && (
                <p
                  style={{
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    color: "#7A6F5E",
                    marginTop: "2px",
                  }}
                >
                  {meta.masthead}
                </p>
              )}
            </div>

            {/* Right: Document kind + number */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontWeight: 600,
                  color: "#7A6F5E",
                  marginBottom: "2px",
                }}
              >
                {meta.kind}
              </p>
              <p
                style={{
                  fontFamily: "'DM Mono', 'Courier New', monospace",
                  fontSize: "13px",
                  color: "#17140F",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {meta.number}
              </p>
              <p style={{ fontSize: "12px", color: "#7A6F5E", marginTop: "6px" }}>{meta.date}</p>
              {meta.dateSecondary && (
                <p style={{ fontSize: "12px", color: "#7A6F5E" }}>
                  {meta.dateLabel ?? "Valid until"}: {meta.dateSecondary}
                </p>
              )}
            </div>
          </div>

          {/* ── Hairline rule ─────────────────────────────────────────── */}
          <div
            style={{
              height: "1px",
              background: "rgba(23,20,15,0.12)",
              marginTop: isA4 ? "18px" : "14px",
              marginBottom: 0,
            }}
          />
        </header>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <main className="document-body" style={{ marginTop: isA4 ? "20px" : "16px" }}>
          {children}
        </main>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        {footer && (
          <footer
            className="document-footer"
            style={{
              marginTop: isA4 ? "32px" : "24px",
              paddingTop: "12px",
              borderTop: "1px solid rgba(23,20,15,0.08)",
              fontSize: "11px",
              color: "#7A6F5E",
            }}
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

// ─── Document Line Item helper ───────────────────────────────────────────────

export interface DocumentLineItem {
  description: string;
  quantity?: number | string;
  unit?: string;
  unitPrice?: number;
  amount: number;
  note?: string;
}

interface DocumentTableProps {
  lines: DocumentLineItem[];
  showQuantity?: boolean;
  currencyFormatter: (value: number) => string;
}

export function DocumentLineTable({ lines, showQuantity = true, currencyFormatter }: DocumentTableProps) {
  const hasQuantities = showQuantity && lines.some((l) => l.quantity !== undefined);

  return (
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <thead>
        <tr style={{ borderBottom: "1px solid rgba(23,20,15,0.12)" }}>
          <th
            style={{
              textAlign: "left",
              padding: "8px 0",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
              color: "#7A6F5E",
            }}
          >
            Description
          </th>
          {hasQuantities && (
            <th
              style={{
                textAlign: "right",
                padding: "8px 12px",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 600,
                color: "#7A6F5E",
                width: "80px",
              }}
            >
              Qty
            </th>
          )}
          <th
            style={{
              textAlign: "right",
              padding: "8px 0",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
              color: "#7A6F5E",
              width: "120px",
            }}
          >
            Amount
          </th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line, i) => (
          <tr
            key={i}
            style={{
              borderBottom: "1px solid rgba(23,20,15,0.04)",
            }}
          >
            <td style={{ padding: "8px 0", fontSize: "13px", color: "#17140F" }}>
              {line.description}
              {line.note && (
                <span style={{ display: "block", fontSize: "11px", color: "#7A6F5E", marginTop: "2px" }}>
                  {line.note}
                </span>
              )}
            </td>
            {hasQuantities && (
              <td style={{ textAlign: "right", padding: "8px 12px", fontSize: "13px", color: "#17140F" }}>
                {line.quantity !== undefined ? line.quantity : "—"}
              </td>
            )}
            <td style={{ textAlign: "right", padding: "8px 0", fontSize: "13px", fontFamily: "'DM Mono', 'Courier New', monospace", color: "#17140F" }}>
              {currencyFormatter(line.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Document Totals helper ──────────────────────────────────────────────────

export interface DocumentTotal {
  label: string;
  value: number;
  bold?: boolean;
  rule?: "above" | "below";
}

interface DocumentTotalsProps {
  totals: DocumentTotal[];
  currencyFormatter: (value: number) => string;
}

export function DocumentTotals({ totals, currencyFormatter }: DocumentTotalsProps) {
  return (
    <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
      <div style={{ width: "260px", maxWidth: "100%" }}>
        {totals.map((total, i) => (
          <div key={i}>
            {total.rule === "above" && (
              <div style={{ height: "1px", background: "rgba(23,20,15,0.08)", marginBottom: "8px" }} />
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                padding: total.bold ? "10px 0" : "4px 0",
                fontWeight: total.bold ? 600 : 400,
                fontSize: total.bold ? "15px" : "13px",
                color: "#17140F",
                borderBottom: total.rule === "below" ? "2px solid rgba(23,20,15,0.15)" : undefined,
              }}
            >
              <span>{total.label}</span>
              <span style={{ fontFamily: "'DM Mono', 'Courier New', monospace", fontVariantNumeric: "tabular-nums" }}>
                {currencyFormatter(total.value)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
