import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Archive, Download, Package, Plus, Search, TrendingDown, TrendingUp } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { apiRequest, ApiError } from "../api";
import {
  EMPTY_LOT_FORM,
  EMPTY_MOVEMENT_FORM,
  fixtureToLotRecord,
  stockStatusFromQuantity,
  type InventoryLotFormValues,
  type InventoryLotRecord,
  type LocationRecord,
  type StockMovementFormValues,
  type StockMovementRecord,
} from "../inventory";
import { INITIAL_INVENTORY, STOCK_PILL, php } from "../data";
import { Btn, ConfirmDialog, Field, FormRow, Input, Modal, Textarea } from "./Modal";
import { Combobox } from "./ui/combobox";
import { PiecePicker } from "./ui/piece-picker";
import { useToast } from "./Toast";
import { exportCsv, exportJson, timestamp } from "../exports";
import { useDraft } from "../useDraft";
import type { Draft } from "../db";

interface LotListResponse {
  data: Array<Omit<InventoryLotRecord, "source">>;
  pagination: { total: number };
}

interface LotDetailResponse {
  data: {
    lot: Omit<InventoryLotRecord, "source">;
    movements: StockMovementRecord[];
    activity: Array<{ id: string; action: string; summary: string; createdAt: string; actorName: string }>;
  };
}

interface LocationsResponse {
  data: LocationRecord[];
}

const USE_DATABASE = import.meta.env.VITE_DATA_MODE === "api";

const KIND_LABELS: Record<string, string> = {
  material: "Material",
  finished_piece: "Finished Piece",
  packaging: "Packaging",
  supply: "Supply",
};

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  receipt: "Receipt",
  reserve: "Reserve",
  release: "Release",
  transfer: "Transfer",
  consume: "Consume",
  sale: "Sale",
  return: "Return",
  adjustment_increase: "Adjustment +",
  adjustment_decrease: "Adjustment −",
  damage: "Damage",
  loss: "Loss",
};

function DraftShelf({
  drafts,
  label,
  onLoad,
  onDiscard,
}: {
  drafts: Draft[];
  label: (draft: Draft) => string;
  onLoad: (draft: Draft) => void;
  onDiscard: (id: string) => Promise<void>;
}) {
  if (!drafts.length) return null;
  return (
    <div className="border border-accent/30 bg-accent/5 p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Saved on this device</p>
      {drafts.slice(0, 3).map((draft) => (
        <div key={draft.id} className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
          <button type="button" onClick={() => onLoad(draft)} className="min-h-9 min-w-0 flex-1 text-left text-[12px] text-foreground">
            {label(draft)} <span className="text-[11px] text-muted-foreground">· {new Date(draft.updatedAt).toLocaleString("en-PH")}</span>
          </button>
          <button type="button" onClick={() => void onDiscard(draft.id)} className="min-h-9 px-2 text-[11px] uppercase tracking-wider text-muted-foreground">Discard</button>
        </div>
      ))}
    </div>
  );
}

function LotForm({
  initial,
  saving,
  locations,
  onCancel,
  onSave,
  drafts,
  onSaveDraft,
  onLoadDraft,
  onDiscardDraft,
}: {
  initial: InventoryLotFormValues;
  saving: boolean;
  locations: LocationRecord[];
  onCancel: () => void;
  onSave: (values: InventoryLotFormValues) => Promise<void>;
  drafts: Draft[];
  onSaveDraft: (values: InventoryLotFormValues) => Promise<void>;
  onLoadDraft: (draft: Draft) => InventoryLotFormValues;
  onDiscardDraft: (id: string) => Promise<void>;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const set = (field: keyof InventoryLotFormValues, value: string) =>
    setValues((c) => ({ ...c, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!values.description.trim()) { setError("Description is required."); return; }
    if (!values.code.trim()) { setError("Batch code is required."); return; }
    if (!values.initialQuantity || parseFloat(values.initialQuantity) <= 0) { setError("Quantity must be positive."); return; }
    if (!values.locationId) { setError("Select a receiving location."); return; }
    try { await onSave(values); } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the batch.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <DraftShelf drafts={drafts} label={(draft) => (draft.values.description as string) || "Untitled inventory batch"} onLoad={(draft) => setValues(onLoadDraft(draft))} onDiscard={onDiscardDraft} />
      {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">{error}</p>}
      <FormRow>
        <Field label="Batch code" required>
          <Input aria-label="Batch code" value={values.code} onChange={(e) => set("code", e.target.value)} maxLength={40} autoFocus />
        </Field>
        <Field label="Kind" required>
          <Combobox
            aria-label="Kind"
            value={values.kind}
            onValueChange={(v) => set("kind", v)}
            options={Object.entries(KIND_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            placeholder="Select kind"
            searchPlaceholder="Search..."
          />
        </Field>
      </FormRow>
      <Field label="Description" required>
        <Input aria-label="Description" value={values.description} onChange={(e) => set("description", e.target.value)} maxLength={500} />
      </Field>
      <FormRow>
        <Field label="Quantity" required>
          <Input aria-label="Quantity" type="number" step="0.0001" min="0.0001" value={values.initialQuantity} onChange={(e) => set("initialQuantity", e.target.value)} />
        </Field>
        <Field label="Unit" required>
          <Input aria-label="Unit" value={values.unit} onChange={(e) => set("unit", e.target.value)} placeholder="pcs, g, ct, m" maxLength={20} />
        </Field>
      </FormRow>
      {values.kind === "finished_piece" && (
        <Field label="Catalog piece" required>
          <PiecePicker
            value={values.catalogPieceId}
            onValueChange={(v) => set("catalogPieceId", v)}
            aria-label="Catalog piece"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            Link this batch to a catalog piece so it appears on the piece's 360 view and can be sold at events.
          </p>
        </Field>
      )}
      <FormRow>
        <Field label="Unit cost (centavos)">
          <Input aria-label="Unit cost" type="number" min="0" value={values.unitCostCents} onChange={(e) => set("unitCostCents", e.target.value)} placeholder="e.g. 15000 = ₱150" />
        </Field>
        <Field label="Receiving location" required>
          <Combobox
            aria-label="Location"
            value={values.locationId}
            onValueChange={(v) => set("locationId", v)}
            options={locations.filter((l) => l.active).map((l) => ({ value: l.id, label: l.name }))}
            placeholder="Select location"
            searchPlaceholder="Search locations..."
          />
        </Field>
      </FormRow>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Btn variant="ghost" onClick={() => void onSaveDraft(values)} disabled={saving}>Save draft</Btn>
        <Btn variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Btn>
        <Btn type="submit" disabled={saving}>{saving ? "Saving..." : "Receive batch"}</Btn>
      </div>
    </form>
  );
}

function MovementForm({
  lotDescription,
  lotUnit,
  saving,
  locations,
  onCancel,
  onSave,
  initial,
  drafts,
  onSaveDraft,
  onLoadDraft,
  onDiscardDraft,
}: {
  lotDescription: string;
  lotUnit: string;
  saving: boolean;
  locations: LocationRecord[];
  onCancel: () => void;
  onSave: (values: StockMovementFormValues) => Promise<void>;
  initial: StockMovementFormValues;
  drafts: Draft[];
  onSaveDraft: (values: StockMovementFormValues) => Promise<void>;
  onLoadDraft: (draft: Draft) => StockMovementFormValues;
  onDiscardDraft: (id: string) => Promise<void>;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const set = (field: keyof StockMovementFormValues, value: string) =>
    setValues((c) => ({ ...c, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!values.quantity || parseFloat(values.quantity) <= 0) { setError("Quantity must be positive."); return; }
    if (!values.fromLocationId && !values.toLocationId) { setError("At least one location is required."); return; }
    if (!values.reason.trim()) { setError("Reason is required."); return; }
    try { await onSave(values); } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record movement.");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-[12px] text-muted-foreground">Recording movement for <strong className="text-foreground">{lotDescription}</strong>.</p>
      <DraftShelf drafts={drafts} label={(draft) => `${String(draft.values.type ?? "movement")} · ${String(draft.values.quantity ?? "")} ${lotUnit}`} onLoad={(draft) => setValues(onLoadDraft(draft))} onDiscard={onDiscardDraft} />
      {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">{error}</p>}
      <FormRow>
        <Field label="Type" required>
          <Combobox
            aria-label="Movement type"
            value={values.type}
            onValueChange={(v) => set("type", v)}
            options={Object.entries(MOVEMENT_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            placeholder="Select type"
            searchPlaceholder="Search types..."
          />
        </Field>
        <Field label={`Quantity (${lotUnit})`} required>
          <Input aria-label="Quantity" type="number" step="0.0001" min="0.0001" value={values.quantity} onChange={(e) => set("quantity", e.target.value)} autoFocus />
        </Field>
      </FormRow>
      <FormRow>
        <Field label="From location">
          <Combobox
            aria-label="From location"
            value={values.fromLocationId}
            onValueChange={(v) => set("fromLocationId", v)}
            options={locations.filter((l) => l.active).map((l) => ({ value: l.id, label: l.name }))}
            placeholder="None"
            searchPlaceholder="Search locations..."
          />
        </Field>
        <Field label="To location">
          <Combobox
            aria-label="To location"
            value={values.toLocationId}
            onValueChange={(v) => set("toLocationId", v)}
            options={locations.filter((l) => l.active).map((l) => ({ value: l.id, label: l.name }))}
            placeholder="None"
            searchPlaceholder="Search locations..."
          />
        </Field>
      </FormRow>
      <Field label="Reason" required>
        <Textarea aria-label="Reason" value={values.reason} onChange={(e) => set("reason", e.target.value)} maxLength={500} placeholder="Why is stock moving?" />
      </Field>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Btn variant="ghost" onClick={() => void onSaveDraft(values)} disabled={saving}>Save count draft</Btn>
        <Btn variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Btn>
        <Btn type="submit" disabled={saving}>{saving ? "Recording..." : "Record movement"}</Btn>
      </div>
    </form>
  );
}

export function InventoryPage() {
  const navigate = useNavigate();
  const { itemId } = useParams();
  const { toast } = useToast();
  // In API mode start empty and let the fetch populate — seeding fixtures here caused
  // sample lots to flash in before being replaced by the real (often empty) DB result.
  const [records, setRecords] = useState<InventoryLotRecord[]>(() =>
    USE_DATABASE ? [] : INITIAL_INVENTORY.map(fixtureToLotRecord),
  );
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [loading, setLoading] = useState(USE_DATABASE);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<"new-batch" | "movement" | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const lotDrafts = useDraft<InventoryLotFormValues>("inventory-batch");

  async function loadLots() {
    if (!USE_DATABASE) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (kindFilter !== "all") params.set("kind", kindFilter);
      if (query.trim()) params.set("q", query.trim());
      const response = await apiRequest<LotListResponse>(`/inventory?${params}`);
      setRecords(response.data.map((r) => ({ ...r, source: "database" as const })));
    } catch (caught) {
      const message = caught instanceof ApiError && caught.status === 401
        ? "Sign in is required."
        : caught instanceof Error ? caught.message : "Inventory could not be loaded.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function loadLocations() {
    if (!USE_DATABASE) return;
    try {
      const response = await apiRequest<LocationsResponse>("/locations");
      setLocations(response.data);
    } catch { /* locations will be empty */ }
  }

  useEffect(() => { void loadLots(); void loadLocations(); }, []);
  useEffect(() => { if (USE_DATABASE) void loadLots(); }, [kindFilter]);

  const visible = useMemo(() => {
    if (USE_DATABASE) return records;
    const needle = query.trim().toLowerCase();
    let filtered = records;
    if (kindFilter !== "all") filtered = filtered.filter((r) => r.kind === kindFilter);
    if (needle) filtered = filtered.filter((r) => r.description.toLowerCase().includes(needle) || r.code.toLowerCase().includes(needle));
    return filtered;
  }, [query, kindFilter, records]);

  const selected = records.find((r) => r.id === itemId) ?? records[0];
  const movementDrafts = useDraft<StockMovementFormValues>(`inventory-movement:${selected?.id ?? "unselected"}`);

  useEffect(() => {
    if (!selected || !USE_DATABASE) { setMovements([]); return; }
    let active = true;
    apiRequest<LotDetailResponse>(`/inventory/${selected.id}`)
      .then((response) => { if (active) setMovements(response.data.movements); })
      .catch(() => { if (active) setMovements([]); });
    return () => { active = false; };
  }, [selected?.id]);

  async function saveLot(values: InventoryLotFormValues) {
    setSaving(true);
    try {
      if (USE_DATABASE) {
        if (!navigator.onLine) {
          await lotDrafts.save(values);
          toast.info("Batch draft saved", "Receiving inventory changes stock and must be submitted while connected.");
          setEditor(null);
          return;
        }
        await apiRequest("/inventory", {
          method: "POST",
          body: JSON.stringify({
            ...values,
            catalogPieceId: values.catalogPieceId || undefined,
            unitCostCents: values.unitCostCents ? parseInt(values.unitCostCents, 10) : undefined,
          }),
        });
        await loadLots();
        if (lotDrafts.activeDraftId) await lotDrafts.discard(lotDrafts.activeDraftId);
      } else {
        const lot: InventoryLotRecord = {
          ...values,
          id: `sample-${crypto.randomUUID()}`,
          catalogPieceId: values.catalogPieceId || null,
          catalogPieceSku: null,
          catalogPieceName: null,
          unitCostCents: values.unitCostCents ? parseInt(values.unitCostCents, 10) : null,
          onHandQuantity: values.initialQuantity,
          receivedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: "fixture",
        };
        setRecords((c) => [...c, lot]);
        navigate(`/inventory/${lot.id}`);
      }
      toast.success("Batch received", `${values.description} added to inventory.`);
      setEditor(null);
    } finally { setSaving(false); }
  }

  async function saveMovement(values: StockMovementFormValues) {
    if (!selected) return;
    setSaving(true);
    try {
      if (USE_DATABASE) {
        if (!navigator.onLine) {
          await movementDrafts.save(values);
          toast.info("Count draft saved", "No stock changed. Reopen this draft and submit it after reconnecting.");
          setEditor(null);
          return;
        }
        await apiRequest("/inventory/movements", {
          method: "POST",
          body: JSON.stringify({
            inventoryLotId: selected.id,
            ...values,
            fromLocationId: values.fromLocationId || undefined,
            toLocationId: values.toLocationId || undefined,
          }),
        });
        await loadLots();
        if (movementDrafts.activeDraftId) await movementDrafts.discard(movementDrafts.activeDraftId);
      }
      toast.success("Movement recorded", `${values.type} of ${values.quantity} ${selected.unit}.`);
      setEditor(null);
    } finally { setSaving(false); }
  }

  async function archiveLot() {
    if (!selected) return;
    if (USE_DATABASE && !navigator.onLine) {
      toast.warning("Connection required", "Archiving inventory cannot be queued or completed offline.");
      return;
    }
    try {
      if (USE_DATABASE) await apiRequest(`/inventory/${selected.id}`, { method: "DELETE" });
      setRecords((c) => c.filter((r) => r.id !== selected.id));
      navigate("/inventory");
      toast.success("Batch archived", `${selected.description} removed from active inventory.`);
    } catch (caught) {
      toast.error("Archive failed", caught instanceof Error ? caught.message : "Please try again.");
    }
  }

  const alerts = records.filter((r) => stockStatusFromQuantity(parseFloat(r.onHandQuantity)) !== "Sufficient").length;
  const onHand = selected ? parseFloat(selected.onHandQuantity) : 0;
  const status = selected ? stockStatusFromQuantity(onHand) : "Sufficient";
  const unitCost = selected?.unitCostCents ? selected.unitCostCents / 100 : 0;

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-accent">Materials & stock</p>
          <h2 className="mt-1 font-serif text-2xl text-foreground">Every gram accounted for.</h2>
          <p className="mt-1 max-w-xl text-[12px] leading-5 text-muted-foreground">
            Track raw materials, finished pieces, packaging, and supplies with append-only movement history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => {
            const cols = [
              { key: "code" as const, label: "Code" },
              { key: "description" as const, label: "Description" },
              { key: "kind" as const, label: "Kind" },
              { key: "unit" as const, label: "Unit" },
              { key: "onHandQuantity" as const, label: "On Hand" },
              { key: "unitCostCents" as const, label: "Unit Cost (centavos)" },
              { key: "createdAt" as const, label: "Created" },
            ];
            exportCsv(records, cols, `seine-inventory-${timestamp()}.csv`);
          }} className="inline-flex min-h-11 items-center gap-2 border border-border px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Download size={13} /> CSV
          </button>
          <button type="button" onClick={() => exportJson(records, `seine-inventory-${timestamp()}.json`)} className="inline-flex min-h-11 items-center gap-2 border border-border px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Download size={13} /> JSON
          </button>
          <button type="button" onClick={() => setEditor("new-batch")} className="inline-flex min-h-11 items-center justify-center gap-2 bg-foreground px-4 text-[12px] uppercase tracking-[0.16em] text-background">
            <Plus size={13} /> Receive batch
          </button>
        </div>
      </div>

      <div className={`border px-4 py-3 text-[12px] ${USE_DATABASE ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-accent/30 bg-accent/5 text-muted-foreground"}`}>
        {USE_DATABASE ? "Shared Neon workspace · movements are append-only." : "Sample workspace · changes last only until this page is refreshed."}
      </div>

      {alerts > 0 && (
        <div className="flex items-center gap-2.5 p-3 border bg-amber-50 border-amber-100">
          <TrendingDown size={13} className="text-amber-600 flex-shrink-0" />
          <p className="text-[11px] text-amber-700">{alerts} item{alerts !== 1 ? "s" : ""} low or out of stock.</p>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 border border-red-200 bg-red-50 p-4 text-[12px] text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => void loadLots()} className="min-h-11 px-3 uppercase tracking-wider">Retry</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-h-11 flex-1 items-center gap-2 border border-border bg-background px-3 sm:max-w-xs">
          <Search size={13} className="text-muted-foreground" />
          <span className="sr-only">Search inventory</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search batch or description" className="w-full bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground" />
        </label>
        {["all", "material", "finished_piece", "packaging", "supply"].map((k) => (
          <button key={k} type="button" onClick={() => setKindFilter(k)}
            className="px-3 py-1 text-[11px] tracking-[0.15em] uppercase border transition-all"
            style={{
              background: kindFilter === k ? "var(--foreground)" : "var(--card)",
              color: kindFilter === k ? "var(--card)" : "var(--muted-foreground)",
              borderColor: kindFilter === k ? "var(--foreground)" : "var(--border)",
            }}>
            {k === "all" ? "All" : KIND_LABELS[k]}
          </button>
        ))}
      </div>

      <div className="grid min-h-[560px] border border-border bg-card lg:grid-cols-[320px_1fr]">
        {/* List */}
        <aside className={`border-b border-border p-4 lg:block lg:border-b-0 lg:border-r ${itemId ? "hidden" : "block"}`}>
          <p className="px-1 pb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {loading ? "Loading inventory" : `${visible.length} batch${visible.length === 1 ? "" : "es"}`}
          </p>
          <div className="max-h-[480px] space-y-1 overflow-auto">
            {visible.map((lot) => {
              const qty = parseFloat(lot.onHandQuantity);
              const st = stockStatusFromQuantity(qty);
              return (
                <button key={lot.id} type="button" onClick={() => navigate(`/inventory/${lot.id}`)}
                  className={`flex min-h-16 w-full items-center justify-between gap-3 border px-3 py-2 text-left transition-colors ${selected?.id === lot.id ? "border-accent/40 bg-accent/5" : "border-transparent hover:border-border"}`}>
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-medium text-foreground">{lot.description}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{lot.code} · {KIND_LABELS[lot.kind] ?? lot.kind}</span>
                    {lot.kind === "finished_piece" && lot.catalogPieceName && (
                      <span className="mt-0.5 block truncate text-[10px] text-accent">
                        {lot.catalogPieceSku} — {lot.catalogPieceName}
                      </span>
                    )}
                  </span>
                  <span className="flex-shrink-0 text-right">
                    <span className="block font-mono text-[11px] text-foreground">{qty} {lot.unit}</span>
                    <span className={`mt-0.5 inline-block px-2 py-0.5 text-[11px] ${STOCK_PILL[st]}`}>{st}</span>
                  </span>
                </button>
              );
            })}
            {!loading && visible.length === 0 && <p className="border border-dashed border-border p-6 text-center text-[12px] text-muted-foreground">No batches match this search.</p>}
          </div>
        </aside>

        {/* Detail */}
        <section className={`min-w-0 lg:block ${itemId ? "block" : "hidden"}`}>
          {!selected ? (
            <div className="flex h-full min-h-80 flex-col items-center justify-center p-8 text-center">
              <Package size={24} className="text-accent" />
              <p className="mt-3 font-serif text-lg text-foreground">No batch selected</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Receive the first batch to begin tracking inventory.</p>
            </div>
          ) : (
            <>
              <header className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
                <button type="button" onClick={() => navigate("/inventory")} className="min-h-11 self-start text-[11px] uppercase tracking-[0.16em] text-muted-foreground lg:hidden">← All batches</button>
                <div>
                  <h3 className="font-serif text-xl text-foreground">{selected.description}</h3>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{selected.code} · {KIND_LABELS[selected.kind] ?? selected.kind}</p>
                </div>
                <div className="flex gap-2">
                  {USE_DATABASE && (
                    <button type="button" onClick={() => setEditor("movement")} className="inline-flex min-h-11 items-center gap-2 border border-border px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <TrendingUp size={12} /> Record movement
                    </button>
                  )}
                  <button type="button" onClick={() => setArchiveOpen(true)} className="inline-flex min-h-11 items-center gap-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Archive size={12} /> Archive
                  </button>
                </div>
              </header>

              <div className="grid sm:grid-cols-2">
                <div className="space-y-5 border-b border-border p-5 sm:border-b-0 sm:border-r">
                  <Detail label="On hand" value={`${onHand} ${selected.unit}`} />
                  <Detail label="Status" value={status} />
                  <Detail label="Unit cost" value={unitCost > 0 ? php(unitCost) : "Not set"} />
                  <Detail label="Stock value" value={unitCost > 0 ? php(onHand * unitCost) : "—"} />
                  <Detail label="Initial quantity" value={`${selected.initialQuantity} ${selected.unit}`} />
                </div>
                <div className="space-y-6 p-5">
                  <div>
                    <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Movement history</p>
                    {movements.length > 0 ? (
                      <div className="space-y-3 border-l border-border pl-4">
                        {[...movements].reverse().map((m) => (
                          <div key={m.id}>
                            <p className="text-[12px] text-foreground">
                              <span className="font-medium">{MOVEMENT_TYPE_LABELS[m.type] ?? m.type}</span> · {m.quantity} {selected.unit}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{m.reason}</p>
                            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                              {m.createdByName} · {new Date(m.occurredAt).toLocaleDateString("en-PH")}
                              {m.fromLocationName && ` · from ${m.fromLocationName}`}
                              {m.toLocationName && ` · to ${m.toLocationName}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="border border-dashed border-border p-4 text-[12px] text-muted-foreground">
                        {USE_DATABASE ? "No movements recorded yet." : "Movement history available in the shared workspace."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <Modal open={editor === "new-batch"} onClose={() => setEditor(null)} title="Receive inventory batch" subtitle="Record a new batch with its initial receipt." width={560}>
        <LotForm
          initial={EMPTY_LOT_FORM}
          saving={saving}
          locations={locations}
          onCancel={() => setEditor(null)}
          onSave={saveLot}
          drafts={lotDrafts.drafts}
          onSaveDraft={async (values) => {
            await lotDrafts.save(values);
            toast.success("Draft saved", "This inventory receipt draft is stored only on this device.");
          }}
          onLoadDraft={lotDrafts.load}
          onDiscardDraft={lotDrafts.discard}
        />
      </Modal>

      <Modal open={editor === "movement"} onClose={() => setEditor(null)} title="Record stock movement" subtitle="Every movement is append-only and auditable." width={520}>
        {selected && (
          <MovementForm
            lotDescription={selected.description}
            lotUnit={selected.unit}
            initial={EMPTY_MOVEMENT_FORM}
            saving={saving}
            locations={locations}
            onCancel={() => setEditor(null)}
            onSave={saveMovement}
            drafts={movementDrafts.drafts}
            onSaveDraft={async (values) => {
              await movementDrafts.save(values);
              toast.success("Count draft saved", "No inventory movement has been posted.");
            }}
            onLoadDraft={movementDrafts.load}
            onDiscardDraft={movementDrafts.discard}
          />
        )}
      </Modal>

      <ConfirmDialog open={archiveOpen} onClose={() => setArchiveOpen(false)} onConfirm={() => void archiveLot()} title="Archive lot" message={`Archive ${selected?.description ?? "this lot"}? Movement history is preserved.`} confirmLabel="Archive" danger />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="text-[11px] text-foreground">{value || "Not added"}</p>
    </div>
  );
}
