import { useMemo, useState } from "react";
import {
  AlertTriangle, Calculator, History, Plus, Sparkles, Trash2, Save,
} from "lucide-react";
import {
  calculatePricing, centavosToPesos, formatCentavos,
  pesosToCentavos, pricingWarnings,
  type PricingLine, type PricingLineCategory, type PricingMarkup,
} from "../pricing";
import { apiRequest } from "../api";
import { PiecePicker } from "./ui/piece-picker";
import { Combobox } from "./ui/combobox";

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<PricingLineCategory, string> = {
  material: "Material",
  labor: "Labor",
  design: "Design",
  packaging: "Packaging",
  outsourced: "Outsourced",
  overhead: "Overhead",
  other: "Other",
};

const DEFAULT_LINES: PricingLine[] = [
  { id: "labor-default", category: "labor", description: "Bench labor", quantity: 4, unit: "hour", unitCostCentavos: 50_000 },
  { id: "design-default", category: "design", description: "Design fee", quantity: 1, unit: "fee", unitCostCentavos: 80_000 },
  { id: "packaging-default", category: "packaging", description: "Packaging", quantity: 1, unit: "piece", unitCostCentavos: 15_000 },
];

const DEFAULT_TARGET_MARGIN = 50; // percent

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `line-${Date.now()}-${Math.random()}`;

// ─── Types ──────────────────────────────────────────────────────────────────

interface QuotePricingPanelProps {
  quoteId: string;
  quoteNumber: string;
  clientName: string | null;
  /** Existing snapshot to restore from (latest version) */
  existingSnapshot?: Record<string, unknown> | null;
  /** Whether the quote is locked (accepted or beyond) */
  locked?: boolean;
  onVersionSaved?: () => void;
}

interface MaterialSuggestion {
  id: string;
  name: string;
  unit: string;
  unitCostCentavos: number;
  source: string;
  available?: string;
  category?: PricingLineCategory;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MoneyInput({ valueCentavos, onChange, label }: {
  valueCentavos: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <div className="flex min-h-10 items-center border border-border bg-card px-2 focus-within:ring-1 focus-within:ring-accent/50">
        <span className="mr-1 text-[12px] text-muted-foreground">₱</span>
        <input
          type="number" inputMode="decimal" min="0" step="0.01"
          value={centavosToPesos(valueCentavos)}
          onChange={(e) => onChange(pesosToCentavos(Number(e.target.value)))}
          className="w-full bg-transparent text-[11px] outline-none"
        />
      </div>
    </label>
  );
}

function CostLineRow({ line, onUpdate, onRemove }: {
  line: PricingLine;
  onUpdate: (patch: Partial<PricingLine>) => void;
  onRemove: () => void;
}) {
  const lineTotal = Math.round(Math.max(0, line.quantity) * Math.max(0, line.unitCostCentavos));
  return (
    <article className="border border-border bg-card p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(120px,1fr)_90px_80px_100px_30px] sm:items-end">
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Description</span>
          <input
            value={line.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Material or task"
            className="min-h-10 w-full border border-border bg-card px-2 text-[11px] outline-none focus:ring-1 focus:ring-accent/50"
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Type</span>
          <Combobox
            options={Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }))}
            value={line.category}
            onValueChange={(v) => onUpdate({ category: v as PricingLineCategory })}
            placeholder="Type…"
            searchPlaceholder="Search type…"
            aria-label={`Category for ${line.description || "line"}`}
          />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Qty / hrs</span>
          <input
            type="number" inputMode="decimal" min="0" step="0.01"
            value={line.quantity}
            onChange={(e) => onUpdate({ quantity: Number(e.target.value) })}
            className="min-h-10 w-full border border-border bg-card px-2 text-[11px] outline-none"
          />
        </label>
        <MoneyInput
          label={`Per ${line.unit}`}
          valueCentavos={line.unitCostCentavos}
          onChange={(v) => onUpdate({ unitCostCentavos: v })}
        />
        <button
          type="button" onClick={onRemove}
          aria-label={`Remove ${line.description || "line"}`}
          className="min-h-10 min-w-10 grid place-items-center text-muted-foreground hover:text-red-600"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{CATEGORY_LABEL[line.category]}</span>
        <span className="font-mono text-[11px] text-foreground">{formatCentavos(lineTotal)}</span>
      </div>
    </article>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function QuotePricingPanel({
  quoteId,
  quoteNumber,
  clientName,
  existingSnapshot,
  locked = false,
  onVersionSaved,
}: QuotePricingPanelProps) {
  // Restore from snapshot or use defaults
  const restored = useMemo(() => {
    if (existingSnapshot && typeof existingSnapshot === "object") {
      const snap = existingSnapshot as Record<string, unknown>;
      return {
        lines: (Array.isArray(snap.lines) ? snap.lines as PricingLine[] : DEFAULT_LINES),
        markupType: (snap.markupType as PricingMarkup["type"]) || "fixed",
        markupValue: (typeof snap.markupValue === "number" ? snap.markupValue : 1700),
        discountCentavos: (typeof snap.discountCentavos === "number" ? snap.discountCentavos : 0),
        overrideEnabled: (snap.overrideEnabled as boolean) || false,
        overrideCentavos: (typeof snap.overrideCentavos === "number" ? snap.overrideCentavos : 0),
        pieceId: (snap.pieceId as string) || "",
        pieceName: (snap.pieceName as string) || "",
        pieceRetailCents: (typeof snap.pieceRetailCents === "number" ? snap.pieceRetailCents : 0),
        targetMargin: (typeof snap.targetMargin === "number" ? snap.targetMargin : DEFAULT_TARGET_MARGIN),
      };
    }
    return null;
  }, [existingSnapshot]);

  const [lines, setLines] = useState<PricingLine[]>(restored?.lines ?? DEFAULT_LINES);
  const [markupType, setMarkupType] = useState<PricingMarkup["type"]>(restored?.markupType ?? "fixed");
  const [markupValue, setMarkupValue] = useState(restored?.markupValue ?? 1700);
  const [discountCentavos, setDiscountCentavos] = useState(restored?.discountCentavos ?? 0);
  const [overrideEnabled, setOverrideEnabled] = useState(restored?.overrideEnabled ?? false);
  const [overrideCentavos, setOverrideCentavos] = useState(restored?.overrideCentavos ?? 0);
  const [pieceId, setPieceId] = useState(restored?.pieceId ?? "");
  const [pieceName, setPieceName] = useState(restored?.pieceName ?? "");
  const [pieceRetailCents, setPieceRetailCents] = useState(restored?.pieceRetailCents ?? 0);
  const [targetMargin, setTargetMargin] = useState(restored?.targetMargin ?? DEFAULT_TARGET_MARGIN);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // ── Calculations ─────────────────────────────────────────────────────────

  const markup: PricingMarkup = markupType === "fixed"
    ? { type: "fixed", amountCentavos: pesosToCentavos(markupValue) }
    : { type: "percentage", basisPoints: Math.round(markupValue * 100) };

  const input = { lines, markup, discountCentavos, sellingPriceOverrideCentavos: overrideEnabled ? overrideCentavos : undefined };
  const totals = useMemo(() => calculatePricing(input), [lines, markupType, markupValue, discountCentavos, overrideEnabled, overrideCentavos]);
  const warnings = pricingWarnings(input, totals);

  // Target margin guardrail (D31)
  const marginPercent = totals.grossMarginBasisPoints / 100;
  const belowTarget = marginPercent < targetMargin && totals.sellingPriceCentavos > 0;

  // ── Line management ──────────────────────────────────────────────────────

  const addLine = (category: PricingLineCategory = "material") => {
    setLines((prev) => [...prev, {
      id: makeId(), category, description: "", quantity: 1, unit: "piece", unitCostCentavos: 0,
    }]);
  };

  const updateLine = (id: string, patch: Partial<PricingLine>) => {
    setLines((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  // ── Piece selection ──────────────────────────────────────────────────────

  const handlePieceSelect = (selected: { id: string; sku: string; name: string; retailPriceCents?: number | null }) => {
    setPieceId(selected.id);
    setPieceName(selected.name);
    setPieceRetailCents(selected.retailPriceCents ?? 0);
  };

  // ── Save version ─────────────────────────────────────────────────────────

  const saveVersion = async () => {
    setSaving(true);
    setSavedMessage(null);
    try {
      const snapshot = {
        pieceId,
        pieceName: pieceName || "Custom commission",
        pieceRetailCents,
        lines,
        markupType,
        markupValue,
        discountCentavos,
        overrideEnabled,
        overrideCentavos,
        targetMargin,
        totals: {
          materialCostCentavos: totals.materialCostCentavos,
          laborCostCentavos: totals.laborCostCentavos,
          designCostCentavos: totals.designCostCentavos,
          otherDirectCostCentavos: totals.otherDirectCostCentavos,
          totalCostCentavos: totals.netCapitalCentavos,
          markupCentavos: totals.markupCentavos,
          discountCentavos: totals.discountCentavos,
          sellingPriceCentavos: totals.sellingPriceCentavos,
          grossProfitCentavos: totals.grossProfitCentavos,
          grossMarginBasisPoints: totals.grossMarginBasisPoints,
        },
        savedAt: new Date().toISOString(),
      };

      await apiRequest(`/api/quotes/${quoteId}/versions`, {
        method: "POST",
        body: JSON.stringify({ snapshot }),
      });

      setSavedMessage("Pricing version saved to quote.");
      onVersionSaved?.();
    } catch (err) {
      setSavedMessage(err instanceof Error ? err.message : "Failed to save version.");
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMessage(null), 3000);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (locked) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <div className="border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-700 mt-0.5 shrink-0" />
          <div>
            <p className="text-[12px] font-medium text-amber-900">Quote locked</p>
            <p className="text-[11px] text-amber-800 mt-1">
              This quote has been accepted and can no longer be edited.
              Create a new quote for revised pricing.
            </p>
          </div>
        </div>
        {existingSnapshot && typeof existingSnapshot === "object" && (
          <PricingSummary snapshot={existingSnapshot as Record<string, unknown>} pieceRetailCents={pieceRetailCents} targetMargin={targetMargin} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Pricing (cost build)</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Itemize costs, add markup, and save as a quote version.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={saveVersion}
            disabled={saving}
            className="inline-flex items-center gap-1.5 min-h-9 px-3 border border-accent/40 bg-accent text-white text-[12px] disabled:opacity-40 transition-opacity"
          >
            <Save size={13} />
            {saving ? "Saving…" : "Save version"}
          </button>
        </div>
      </div>

      {savedMessage && (
        <div className={`border p-3 text-[12px] ${savedMessage.includes("Failed") ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          {savedMessage}
        </div>
      )}

      {/* ── Piece + client context ─────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-3 border border-border bg-card p-4 sm:grid-cols-2">
        <div className="space-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Piece (design reference)</span>
          <PiecePicker
            value={pieceId}
            onValueChange={(id, item) => handlePieceSelect({ id, sku: item?.sku ?? "", name: item?.label ?? "", retailPriceCents: item?.retailPriceCents })}
            placeholder="Search catalog piece…"
          />
          {pieceId && pieceRetailCents > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Retail benchmark: {formatCentavos(pieceRetailCents)}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Client</span>
          <div className="min-h-10 flex items-center border border-border bg-muted/20 px-3">
            <p className="text-[12px] text-foreground">{clientName || "No client selected"}</p>
          </div>
          <p className="text-[11px] text-muted-foreground">Quote {quoteNumber}</p>
        </div>
      </section>

      {/* ── Cost lines ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Cost lines</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Quantity × unit cost is calculated automatically.</p>
          </div>
          <span className="font-mono text-[12px] text-muted-foreground">{lines.length} lines</span>
        </div>

        {/* Quick-add buttons */}
        <div className="flex flex-wrap gap-1.5">
          {(["material", "labor", "design", "packaging", "outsourced", "overhead", "other"] as PricingLineCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => addLine(cat)}
              className="inline-flex items-center gap-1 min-h-8 px-2.5 border border-border bg-card text-[11px] text-muted-foreground hover:border-accent/30 transition-colors"
            >
              <Plus size={11} />
              {CATEGORY_LABEL[cat]}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {lines.map((line) => (
            <CostLineRow
              key={line.id}
              line={line}
              onUpdate={(patch) => updateLine(line.id, patch)}
              onRemove={() => removeLine(line.id)}
            />
          ))}
        </div>
      </section>

      {/* ── Commercial adjustments + summary ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
        {/* Adjustments */}
        <section className="border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Commercial adjustments</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMarkupType("fixed")}
              className={`min-h-10 border text-[12px] ${markupType === "fixed" ? "border-foreground bg-foreground text-card" : "border-border text-muted-foreground"}`}
            >
              Fixed markup
            </button>
            <button
              type="button"
              onClick={() => setMarkupType("percentage")}
              className={`min-h-10 border text-[12px] ${markupType === "percentage" ? "border-foreground bg-foreground text-card" : "border-border text-muted-foreground"}`}
            >
              Percentage
            </button>
          </div>

          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Markup {markupType === "fixed" ? "(₱)" : "(%)"}
            </span>
            <input
              type="number" inputMode="decimal" min="0"
              step={markupType === "fixed" ? "0.01" : "0.1"}
              value={markupValue}
              onChange={(e) => setMarkupValue(Number(e.target.value))}
              className="min-h-10 w-full border border-border bg-card px-3 text-[11px] outline-none"
            />
          </label>

          <MoneyInput label="Discount" valueCentavos={discountCentavos} onChange={setDiscountCentavos} />

          <label className="flex min-h-11 items-center gap-2 border-t border-border pt-3 text-[12px] text-muted-foreground">
            <input
              type="checkbox"
              checked={overrideEnabled}
              onChange={(e) => {
                setOverrideEnabled(e.target.checked);
                if (e.target.checked && overrideCentavos === 0) setOverrideCentavos(totals.suggestedPriceCentavos);
              }}
            />
            Manually override selling price
          </label>
          {overrideEnabled && (
            <MoneyInput label="Selling price override" valueCentavos={overrideCentavos} onChange={setOverrideCentavos} />
          )}

          {/* Target margin guardrail (D31) */}
          <div className="border-t border-border pt-3 space-y-1">
            <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Target margin (%)
              <input
                type="number" min={0} max={100} step={1}
                value={targetMargin}
                onChange={(e) => setTargetMargin(Number(e.target.value))}
                className="w-16 min-h-8 border border-border bg-card px-2 text-[11px] outline-none"
              />
            </label>
            {belowTarget && (
              <div className="flex items-center gap-2 text-[11px] text-amber-700">
                <AlertTriangle size={12} />
                Below your target margin of {targetMargin}% (current: {marginPercent.toFixed(1)}%)
              </div>
            )}
          </div>
        </section>

        {/* Pricing summary */}
        <PricingSummaryPanel
          totals={totals}
          pieceRetailCents={pieceRetailCents}
          marginPercent={marginPercent}
          belowTarget={belowTarget}
          targetMargin={targetMargin}
          warnings={warnings}
        />
      </div>
    </div>
  );
}

// ─── Pricing Summary Panel ───────────────────────────────────────────────────

function PricingSummaryPanel({
  totals,
  pieceRetailCents,
  marginPercent,
  belowTarget,
  targetMargin,
  warnings,
}: {
  totals: ReturnType<typeof calculatePricing>;
  pieceRetailCents: number;
  marginPercent: number;
  belowTarget: boolean;
  targetMargin: number;
  warnings: string[];
}) {
  return (
    <aside className="space-y-3 xl:sticky xl:top-0 xl:self-start">
      {/* Dark summary card */}
      <section className="border border-[#9f7c3f] bg-[#17140F] p-5 text-[#FAF7F0]">
        <div className="flex items-center gap-2">
          <Calculator size={14} className="text-[#D2B06B]" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#9F927E]">Price summary</p>
        </div>
        <dl className="mt-4 space-y-2 text-[12px]">
          {[
            ["Materials & packaging", totals.materialCostCentavos],
            ["Labor", totals.laborCostCentavos],
            ["Design", totals.designCostCentavos],
            ["Other direct cost", totals.otherDirectCostCentavos],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex justify-between gap-3 text-[#B9AE9C]">
              <dt>{String(label)}</dt>
              <dd className="font-mono">{formatCentavos(Number(value))}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-white/10 pt-2">
            <dt>Total cost</dt>
            <dd className="font-mono">{formatCentavos(totals.netCapitalCentavos)}</dd>
          </div>
          <div className="flex justify-between text-[#D2B06B]">
            <dt>Markup</dt>
            <dd className="font-mono">{formatCentavos(totals.markupCentavos)}</dd>
          </div>
          {totals.discountCentavos > 0 && (
            <div className="flex justify-between text-[#D7A89C]">
              <dt>Discount</dt>
              <dd className="font-mono">−{formatCentavos(totals.discountCentavos)}</dd>
            </div>
          )}
        </dl>
        <div className="mt-4 border-t border-white/15 pt-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#9F927E]">Selling price</p>
          <p className="mt-1 font-serif text-3xl">{formatCentavos(totals.sellingPriceCentavos)}</p>
          <div className="mt-3 flex justify-between text-[12px] text-[#B9AE9C]">
            <span>Gross profit {formatCentavos(totals.grossProfitCentavos)}</span>
            <span>{marginPercent.toFixed(1)}% margin</span>
          </div>
          {pieceRetailCents > 0 && (
            <div className="mt-2 text-[11px] text-[#9F927E]">
              Piece retail benchmark: {formatCentavos(pieceRetailCents)}
            </div>
          )}
          {belowTarget && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-400">
              <AlertTriangle size={12} />
              Below target margin ({targetMargin}%)
            </div>
          )}
        </div>
      </section>

      {warnings.length > 0 && (
        <section className="border border-amber-200 bg-amber-50 p-3" aria-live="polite">
          <div className="flex gap-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-700" />
            <div>
              <p className="text-[12px] font-medium text-amber-900">Review before saving</p>
              {warnings.map((w) => <p key={w} className="mt-1 text-[11px] text-amber-800">{w}</p>)}
            </div>
          </div>
        </section>
      )}
    </aside>
  );
}

// ─── Read-only summary for locked quotes ─────────────────────────────────────

function PricingSummary({ snapshot, pieceRetailCents, targetMargin }: {
  snapshot: Record<string, unknown>;
  pieceRetailCents: number;
  targetMargin: number;
}) {
  const totals = snapshot.totals as Record<string, number> | undefined;
  if (!totals) {
    return <p className="text-[12px] text-muted-foreground">No pricing snapshot available.</p>;
  }
  const marginPercent = totals.sellingPriceCentavos > 0
    ? (totals.grossProfitCentavos * 100) / totals.sellingPriceCentavos
    : 0;

  return (
    <section className="border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <History size={14} className="text-accent" />
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Pricing snapshot (locked)</p>
      </div>
      <dl className="space-y-2 text-[12px]">
        {[
          ["Materials & packaging", totals.materialCostCentavos],
          ["Labor", totals.laborCostCentavos],
          ["Design", totals.designCostCentavos],
          ["Other direct cost", totals.otherDirectCostCentavos],
          ["Total cost", totals.totalCostCentavos],
          ["Markup", totals.markupCentavos],
        ].map(([label, value]) => (
          <div key={String(label)} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{String(label)}</dt>
            <dd className="font-mono">{formatCentavos(Number(value))}</dd>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-2">
          <dt className="font-medium">Selling price</dt>
          <dd className="font-mono font-medium">{formatCentavos(totals.sellingPriceCentavos)}</dd>
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Gross profit {formatCentavos(totals.grossProfitCentavos)}</span>
          <span>{marginPercent.toFixed(1)}% margin</span>
        </div>
        {pieceRetailCents > 0 && (
          <div className="text-[11px] text-muted-foreground">
            Piece retail benchmark: {formatCentavos(pieceRetailCents)}
          </div>
        )}
      </dl>
    </section>
  );
}
