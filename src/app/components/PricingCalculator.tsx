import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calculator,
  Check,
  ChevronsUpDown,
  History,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import type { Client, InventoryItem, Project } from "../data";
import {
  calculatePricing,
  centavosToPesos,
  formatCentavos,
  pesosToCentavos,
  pricingWarnings,
  type PricingLine,
  type PricingLineCategory,
  type PricingMarkup,
} from "../pricing";
import { createPricingVersion, parseTrackerCsv, type PricingVersion, type TrackerBlock } from "../pricingHistory";
import { apiRequest } from "../api";

interface SavedCalculation {
  id: string;
  title: string;
  updatedAt: string;
  versions: Array<{
    id: string;
    version: number;
    inputs: { lines: PricingLine[]; markup: PricingMarkup; discountCentavos: number; sellingPriceOverrideCentavos?: number };
    totalCostCents: number;
    suggestedPriceCents: number;
    createdAt: string;
  }>;
}
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface MaterialSuggestion {
  id: string;
  name: string;
  unit: string;
  unitCostCentavos: number;
  source: string;
  available?: string;
  category?: PricingLineCategory;
}

export interface PreparedQuote {
  projectId: string;
  clientName: string;
  description: string;
  totalPesos: number;
}

interface PricingCalculatorProps {
  projects: Project[];
  clients: Client[];
  inventory: InventoryItem[];
  onPrepareQuote: (quote: PreparedQuote) => void;
}

const TRACKER_SUGGESTIONS: MaterialSuggestion[] = [
  { id: "tracker-packaging", name: "Packaging", unit: "piece", unitCostCentavos: 15_000, source: "Financial tracker", category: "packaging" },
  { id: "tracker-cloth", name: "Polishing Cloth", unit: "piece", unitCostCentavos: 1_600, source: "Financial tracker", category: "packaging" },
  { id: "tracker-d-carabiner", name: "D Carabiner", unit: "piece", unitCostCentavos: 3_050, source: "Financial tracker" },
  { id: "tracker-lock-carabiner", name: "Lock Carabiner", unit: "piece", unitCostCentavos: 3_300, source: "Financial tracker" },
  { id: "tracker-jump-ring", name: "Jump Ring 5-1", unit: "piece", unitCostCentavos: 4_000, source: "Financial tracker" },
  { id: "tracker-chain", name: "Chain", unit: "piece", unitCostCentavos: 10_800, source: "Financial tracker" },
];

const DEFAULT_LINES: PricingLine[] = [
  {
    id: "labor-default",
    category: "labor",
    description: "Bench labor",
    quantity: 4,
    unit: "hour",
    unitCostCentavos: 50_000,
  },
  {
    id: "design-default",
    category: "design",
    description: "Design fee",
    quantity: 1,
    unit: "fee",
    unitCostCentavos: 80_000,
  },
  {
    id: "packaging-default",
    category: "packaging",
    description: "Packaging",
    quantity: 1,
    unit: "piece",
    unitCostCentavos: 15_000,
  },
];

const CATEGORY_LABEL: Record<PricingLineCategory, string> = {
  material: "Material",
  labor: "Labor",
  design: "Design",
  packaging: "Packaging",
  outsourced: "Outsourced",
  overhead: "Overhead",
  other: "Other",
};

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `line-${Date.now()}-${Math.random()}`;
const HISTORY_KEY = "seine.pricing-versions.v1";

function readPricingVersions(): PricingVersion[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function MaterialPicker({ suggestions, onSelect, onAddBlank }: {
  suggestions: MaterialSuggestion[];
  onSelect: (suggestion: MaterialSuggestion) => void;
  onAddBlank: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-label="Add material"
          aria-expanded={open}
          className="flex min-h-11 w-full items-center justify-between border border-border bg-card px-3 text-left text-[11px] text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          Search inventory or recent materials
          <ChevronsUpDown size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Type a material, SKU, or category..." />
          <CommandList>
            <CommandEmpty>
              <button type="button" onClick={() => { onAddBlank(); setOpen(false); }} className="text-[11px] text-accent">
                Add a one-off material
              </button>
            </CommandEmpty>
            <CommandGroup heading="Inventory and recent materials">
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.id}
                  value={`${suggestion.name} ${suggestion.id} ${suggestion.source}`}
                  onSelect={() => {
                    onSelect(suggestion);
                    setOpen(false);
                  }}
                  className="py-2.5"
                >
                  <Check size={13} className="text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium">{suggestion.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatCentavos(suggestion.unitCostCentavos)} / {suggestion.unit} · {suggestion.source}
                    </p>
                  </div>
                  {suggestion.available && <span className="text-[11px] text-muted-foreground">{suggestion.available}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup>
              <CommandItem value="create one-off material" onSelect={() => { onAddBlank(); setOpen(false); }}>
                <Plus size={13} /> Add one-off material
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function MoneyInput({ valueCentavos, onChange, label }: {
  valueCentavos: number;
  onChange: (valueCentavos: number) => void;
  label: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <div className="flex min-h-10 items-center border border-border bg-card px-2 focus-within:ring-1 focus-within:ring-accent/50">
        <span className="mr-1 text-[12px] text-muted-foreground">₱</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={centavosToPesos(valueCentavos)}
          onChange={(event) => onChange(pesosToCentavos(Number(event.target.value)))}
          className="w-full bg-transparent text-[11px] outline-none"
        />
      </div>
    </label>
  );
}

export function PricingCalculator({ projects, clients, inventory, onPrepareQuote }: PricingCalculatorProps) {
  const [pieceName, setPieceName] = useState("Custom creation");
  const [projectId, setProjectId] = useState("");
  const [clientName, setClientName] = useState("");
  const [lines, setLines] = useState<PricingLine[]>(DEFAULT_LINES);
  const [markupType, setMarkupType] = useState<PricingMarkup["type"]>("fixed");
  const [markupValue, setMarkupValue] = useState(1700);
  const [discountCentavos, setDiscountCentavos] = useState(0);
  const [overrideEnabled, setOverrideEnabled] = useState(false);
  const [overrideCentavos, setOverrideCentavos] = useState(0);
  const [versions, setVersions] = useState<PricingVersion[]>(readPricingVersions);
  const [trackerBlocks, setTrackerBlocks] = useState<TrackerBlock[]>([]);
  const [savedCalcs, setSavedCalcs] = useState<SavedCalculation[]>([]);
  const [activeCalcId, setActiveCalcId] = useState<string | null>(null);
  const [draftSaving, setDraftSaving] = useState(false);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(versions));
  }, [versions]);

  useEffect(() => {
    if (import.meta.env.VITE_DATA_MODE !== "api") return;
    apiRequest<{ data: SavedCalculation[] }>("/pricing")
      .then((res) => setSavedCalcs(res.data))
      .catch(() => {});
  }, []);

  const suggestions = useMemo<MaterialSuggestion[]>(() => [
    ...inventory.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      unitCostCentavos: pesosToCentavos(item.costPerUnit),
      source: `Inventory · ${item.id}`,
      available: `${item.quantity} ${item.unit}`,
      category: "material" as const,
    })),
    ...TRACKER_SUGGESTIONS,
  ], [inventory]);

  const markup: PricingMarkup = markupType === "fixed"
    ? { type: "fixed", amountCentavos: pesosToCentavos(markupValue) }
    : { type: "percentage", basisPoints: Math.round(markupValue * 100) };
  const input = {
    lines,
    markup,
    discountCentavos,
    sellingPriceOverrideCentavos: overrideEnabled ? overrideCentavos : undefined,
  };
  const totals = useMemo(() => calculatePricing(input), [lines, markupType, markupValue, discountCentavos, overrideEnabled, overrideCentavos]);
  const warnings = pricingWarnings(input, totals);
  const selectedProject = projects.find((project) => project.id === projectId);

  const addSuggestion = (suggestion: MaterialSuggestion) => {
    setLines((current) => [...current, {
      id: makeId(),
      category: suggestion.category ?? "material",
      description: suggestion.name,
      quantity: 1,
      unit: suggestion.unit,
      unitCostCentavos: suggestion.unitCostCentavos,
    }]);
  };

  const addBlank = () => {
    setLines((current) => [...current, {
      id: makeId(),
      category: "material",
      description: "",
      quantity: 1,
      unit: "piece",
      unitCostCentavos: 0,
    }]);
  };

  const updateLine = (id: string, patch: Partial<PricingLine>) => {
    setLines((current) => current.map((line) => line.id === id ? { ...line, ...patch } : line));
  };

  const chooseProject = (nextProjectId: string) => {
    setProjectId(nextProjectId);
    const project = projects.find((item) => item.id === nextProjectId);
    if (!project) return;
    setPieceName(project.name);
    if (project.client !== "—") setClientName(project.client);
  };

  const prepareQuote = () => {
    onPrepareQuote({
      projectId,
      clientName: clientName || selectedProject?.client || "",
      description: pieceName.trim() || "Custom creation",
      totalPesos: centavosToPesos(totals.sellingPriceCentavos),
    });
  };

  const saveVersion = async () => {
    const next = createPricingVersion(versions, { pieceName: pieceName.trim() || "Custom creation", projectId, clientName, input });
    setVersions((current) => [...current, next]);

    if (import.meta.env.VITE_DATA_MODE === "api") {
      setDraftSaving(true);
      try {
        const payload = {
          pieceName: next.pieceName,
          projectId: next.projectId || undefined,
          clientName: next.clientName,
          input: next.input,
          totalCostCents: totals.netCapitalCentavos,
          suggestedPriceCents: totals.suggestedPriceCentavos,
        };

        if (activeCalcId) {
          await apiRequest(`/pricing/${activeCalcId}/versions`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
        } else {
          const res = await apiRequest<{ data: { id: string } }>("/pricing", {
            method: "POST",
            body: JSON.stringify({ title: next.pieceName, ...payload }),
          });
          setActiveCalcId(res.data.id);
        }
        const refreshed = await apiRequest<{ data: SavedCalculation[] }>("/pricing");
        setSavedCalcs(refreshed.data);
      } catch {
        // Saved locally; API sync failed silently
      } finally {
        setDraftSaving(false);
      }
    }
  };

  const loadDraft = (calc: SavedCalculation) => {
    const latest = calc.versions[calc.versions.length - 1];
    if (!latest) return;
    const restored = latest.inputs;
    setPieceName(calc.title);
    setLines(restored.lines.map((line) => ({ ...line, id: line.id || makeId() })));
    if (restored.markup.type === "fixed") {
      setMarkupType("fixed");
      setMarkupValue(centavosToPesos(restored.markup.amountCentavos));
    } else {
      setMarkupType("percentage");
      setMarkupValue(restored.markup.basisPoints / 100);
    }
    setDiscountCentavos(restored.discountCentavos);
    if (restored.sellingPriceOverrideCentavos !== undefined) {
      setOverrideEnabled(true);
      setOverrideCentavos(restored.sellingPriceOverrideCentavos);
    } else {
      setOverrideEnabled(false);
    }
    setActiveCalcId(calc.id);
  };

  const reviewCsv = async (file?: File) => {
    if (!file) return;
    setTrackerBlocks(parseTrackerCsv(await file.text()));
  };

  const loadTrackerBlock = (block: TrackerBlock) => {
    setPieceName(block.name);
    setLines(block.lines.map((line) => ({ ...line, id: makeId() })));
    setMarkupType("fixed");
    setMarkupValue(block.markupPesos);
    setOverrideEnabled(false);
    setTrackerBlocks([]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Custom pricing</p>
          <h2 className="mt-1 font-serif text-2xl font-normal text-foreground">Build the price from its truth.</h2>
          <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-muted-foreground">
            Suggested values come from inventory and the Seine Studio tracker. Review every cost before preparing a quote.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex min-h-11 cursor-pointer items-center border border-border bg-card px-3 text-[12px] uppercase tracking-wider text-muted-foreground">
            <Upload className="mr-2" size={13} />Review tracker CSV
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => reviewCsv(event.target.files?.[0])} />
          </label>
          <button type="button" onClick={saveVersion} disabled={draftSaving} className="min-h-11 border border-border bg-card px-3 text-[12px] uppercase tracking-wider text-foreground disabled:opacity-50"><History className="mr-2 inline" size={13} />{draftSaving ? "Saving…" : activeCalcId ? "Save new version" : "Save version"}</button>
          <button type="button" onClick={prepareQuote} disabled={!pieceName.trim() || !clientName || totals.sellingPriceCentavos <= 0} className="min-h-11 bg-foreground px-4 text-[11px] font-medium text-card disabled:cursor-not-allowed disabled:opacity-35">Prepare quote</button>
        </div>
      </div>

      {trackerBlocks.length > 0 && (
        <section className="border border-amber-200 bg-amber-50 p-4" aria-label="CSV import review">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[12px] font-medium text-amber-950">Review {trackerBlocks.length} pricing blocks</p><p className="mt-1 text-[11px] text-amber-800">Nothing is imported until you choose a block. Warning rows require manual verification.</p></div><button type="button" onClick={() => setTrackerBlocks([])} className="min-h-11 px-3 text-[12px] text-amber-900">Cancel</button></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {trackerBlocks.map((block) => (
              <article key={block.id} className="border border-amber-200 bg-card p-3">
                <div className="flex justify-between gap-3"><div><p className="text-[11px] font-medium">{block.name}</p><p className="mt-1 text-[11px] text-muted-foreground">{block.lines.length} staged lines · {block.warnings.length} warnings</p></div><button type="button" onClick={() => loadTrackerBlock(block)} className="min-h-11 border border-foreground px-3 text-[11px] uppercase tracking-wider">Load reviewed block</button></div>
                {block.warnings.slice(0, 3).map((warning) => <p key={warning} className="mt-2 text-[11px] text-amber-800">• {warning}</p>)}
              </article>
            ))}
          </div>
        </section>
      )}

      {savedCalcs.length > 0 && (
        <details className="border border-border bg-card p-3">
          <summary className="cursor-pointer text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Saved pricing drafts ({savedCalcs.length})</summary>
          <div className="mt-3 space-y-2">
            {savedCalcs.slice(0, 10).map((calc) => (
              <div key={calc.id} className="flex items-center justify-between border-t border-border pt-2 text-[12px]">
                <div>
                  <span className="font-medium">{calc.title}</span>
                  <span className="ml-2 text-muted-foreground">{calc.versions.length} version{calc.versions.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{new Date(calc.updatedAt).toLocaleDateString("en-PH")}</span>
                  <button type="button" onClick={() => loadDraft(calc)} className="text-[11px] uppercase tracking-wider text-accent hover:underline">{activeCalcId === calc.id ? "Active" : "Load"}</button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {versions.length > 0 && (
        <details className="border border-border bg-card p-3">
          <summary className="cursor-pointer text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Local pricing history ({versions.length})</summary>
          <div className="mt-3 space-y-2">{versions.slice().reverse().slice(0, 8).map((version) => <div key={version.id} className="flex justify-between border-t border-border pt-2 text-[12px]"><span>{version.pieceName} · v{version.version}</span><span className="text-muted-foreground">{new Date(version.createdAt).toLocaleString("en-PH")}</span></div>)}</div>
        </details>
      )}

      <section className="grid grid-cols-1 gap-3 border border-border bg-card p-4 sm:grid-cols-3">
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Project</span>
          <select value={projectId} onChange={(event) => chooseProject(event.target.value)} className="min-h-10 w-full border border-border bg-card px-2 text-[11px] outline-none focus:ring-1 focus:ring-accent/50">
            <option value="">New custom inquiry</option>
            {projects.filter((project) => project.type === "Commission").map((project) => (
              <option key={project.id} value={project.id}>{project.id} · {project.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Client</span>
          <select value={clientName} onChange={(event) => setClientName(event.target.value)} className="min-h-10 w-full border border-border bg-card px-2 text-[11px] outline-none focus:ring-1 focus:ring-accent/50">
            <option value="">Select client</option>
            {clients.map((client) => <option key={client.id} value={client.name}>{client.name} · {client.location}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Piece or service</span>
          <input value={pieceName} onChange={(event) => setPieceName(event.target.value)} className="min-h-10 w-full border border-border bg-card px-3 text-[11px] outline-none focus:ring-1 focus:ring-accent/50" />
        </label>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Cost lines</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Quantity × unit cost is calculated automatically.</p>
            </div>
            <span className="font-mono text-[12px] text-muted-foreground">{lines.length} lines</span>
          </div>

          <MaterialPicker suggestions={suggestions} onSelect={addSuggestion} onAddBlank={addBlank} />

          <div className="space-y-2">
            {lines.map((line) => (
              <article key={line.id} className="border border-border bg-card p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(150px,1fr)_110px_90px_120px_30px] sm:items-end">
                  <label className="space-y-1">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Description</span>
                    <input value={line.description} onChange={(event) => updateLine(line.id, { description: event.target.value })} placeholder="Material or task" className="min-h-10 w-full border border-border bg-card px-2 text-[11px] outline-none focus:ring-1 focus:ring-accent/50" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Type</span>
                    <select value={line.category} onChange={(event) => updateLine(line.id, { category: event.target.value as PricingLineCategory })} className="min-h-10 w-full border border-border bg-card px-2 text-[12px] outline-none">
                      {Object.entries(CATEGORY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Qty / hours</span>
                    <input type="number" inputMode="decimal" min="0" step="0.01" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) })} className="min-h-10 w-full border border-border bg-card px-2 text-[11px] outline-none" />
                  </label>
                  <MoneyInput label={`Per ${line.unit}`} valueCentavos={line.unitCostCentavos} onChange={(value) => updateLine(line.id, { unitCostCentavos: value })} />
                  <button type="button" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} aria-label={`Remove ${line.description || "line"}`} className="min-h-10 min-w-10 grid place-items-center text-muted-foreground hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{CATEGORY_LABEL[line.category]}</span>
                  <span className="font-mono text-[11px] text-foreground">{formatCentavos(Math.round(line.quantity * line.unitCostCentavos))}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-3 xl:sticky xl:top-0 xl:self-start">
          <section className="border border-border bg-card p-4">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={14} className="text-accent" />
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Commercial adjustments</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMarkupType("fixed")} className={`min-h-10 border text-[12px] ${markupType === "fixed" ? "border-foreground bg-foreground text-card" : "border-border text-muted-foreground"}`}>Fixed markup</button>
              <button type="button" onClick={() => setMarkupType("percentage")} className={`min-h-10 border text-[12px] ${markupType === "percentage" ? "border-foreground bg-foreground text-card" : "border-border text-muted-foreground"}`}>Percentage</button>
            </div>
            <label className="mt-3 block space-y-1">
              <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Brand value {markupType === "fixed" ? "(₱)" : "(%)"}</span>
              <input type="number" inputMode="decimal" min="0" step={markupType === "fixed" ? "0.01" : "0.1"} value={markupValue} onChange={(event) => setMarkupValue(Number(event.target.value))} className="min-h-10 w-full border border-border bg-card px-3 text-[11px] outline-none" />
            </label>
            <div className="mt-3">
              <MoneyInput label="Discount" valueCentavos={discountCentavos} onChange={setDiscountCentavos} />
            </div>
            <label className="mt-4 flex min-h-11 items-center gap-2 border-t border-border pt-3 text-[12px] text-muted-foreground">
              <input type="checkbox" checked={overrideEnabled} onChange={(event) => {
                setOverrideEnabled(event.target.checked);
                if (event.target.checked && overrideCentavos === 0) setOverrideCentavos(totals.suggestedPriceCentavos);
              }} />
              Manually override selling price
            </label>
            {overrideEnabled && <MoneyInput label="Selling price override" valueCentavos={overrideCentavos} onChange={setOverrideCentavos} />}
          </section>

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
                  <dt>{String(label)}</dt><dd className="font-mono">{formatCentavos(Number(value))}</dd>
                </div>
              ))}
              <div className="flex justify-between border-t border-white/10 pt-2"><dt>Net capital</dt><dd className="font-mono">{formatCentavos(totals.netCapitalCentavos)}</dd></div>
              <div className="flex justify-between text-[#D2B06B]"><dt>Brand value</dt><dd className="font-mono">{formatCentavos(totals.markupCentavos)}</dd></div>
              {totals.discountCentavos > 0 && <div className="flex justify-between text-[#D7A89C]"><dt>Discount</dt><dd className="font-mono">−{formatCentavos(totals.discountCentavos)}</dd></div>}
            </dl>
            <div className="mt-4 border-t border-white/15 pt-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#9F927E]">Selling price</p>
              <p className="mt-1 font-serif text-3xl">{formatCentavos(totals.sellingPriceCentavos)}</p>
              <div className="mt-3 flex justify-between text-[12px] text-[#B9AE9C]">
                <span>Gross profit {formatCentavos(totals.grossProfitCentavos)}</span>
                <span>{(totals.grossMarginBasisPoints / 100).toFixed(1)}% margin</span>
              </div>
            </div>
          </section>

          {warnings.length > 0 && (
            <section className="border border-amber-200 bg-amber-50 p-3" aria-live="polite">
              <div className="flex gap-2">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-700" />
                <div>
                  <p className="text-[12px] font-medium text-amber-900">Review before quoting</p>
                  {warnings.map((warning) => <p key={warning} className="mt-1 text-[11px] text-amber-800">{warning}</p>)}
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
