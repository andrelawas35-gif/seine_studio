import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Receipt, Plus, Search, X } from "lucide-react";
import { apiRequest } from "../api";
import { Combobox, type ComboboxOption } from "./ui/combobox";
import { MasterDetail } from "./ui/master-detail";
import { Modal } from "./Modal";
import { useDebouncedValue } from "./ui/use-debounced-value";
import { php } from "../data";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExpenseRecord {
  id: string;
  supplierId: string | null;
  supplierName: string | null;
  projectId: string | null;
  eventId: string | null;
  category: string;
  description: string;
  amountCents: number;
  method: string;
  receiptUrl: string | null;
  incurredAt: string;
  isCogs: boolean;
  notes: string | null;
  createdAt: string;
}

interface ExpenseDetail extends ExpenseRecord {
  updatedAt: string;
  activity: unknown[];
}

interface SupplierOption {
  id: string;
  name: string;
}

const CATEGORIES: ComboboxOption[] = [
  { value: "materials", label: "Materials" },
  { value: "stones", label: "Stones" },
  { value: "findings", label: "Findings" },
  { value: "packaging", label: "Packaging" },
  { value: "labor", label: "Outsourced Labor" },
  { value: "shipping", label: "Shipping" },
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "marketing", label: "Marketing" },
  { value: "travel", label: "Travel" },
  { value: "tools", label: "Tools & Equipment" },
  { value: "other", label: "Other" },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  card: "Card",
  gcash: "GCash",
  maya: "Maya",
  other: "Other",
};

const CATEGORY_STYLES: Record<string, string> = {
  materials: "bg-amber-50 text-amber-800 border-amber-200",
  stones: "bg-violet-50 text-violet-800 border-violet-200",
  findings: "bg-sky-50 text-sky-800 border-sky-200",
  packaging: "bg-teal-50 text-teal-800 border-teal-200",
  labor: "bg-orange-50 text-orange-800 border-orange-200",
  shipping: "bg-blue-50 text-blue-800 border-blue-200",
  rent: "bg-slate-100 text-slate-700 border-slate-200",
  utilities: "bg-slate-100 text-slate-700 border-slate-200",
  marketing: "bg-pink-50 text-pink-800 border-pink-200",
  travel: "bg-indigo-50 text-indigo-800 border-indigo-200",
  tools: "bg-gray-100 text-gray-700 border-gray-200",
  other: "bg-stone-100 text-stone-600 border-stone-200",
};

const USE_DATABASE = import.meta.env.VITE_DATA_MODE === "api";

// ─── Component ───────────────────────────────────────────────────────────────

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [cogsFilter, setCogsFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExpenseDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [supplierId, setSupplierId] = useState("");
  const [supplierOptions, setSupplierOptions] = useState<ComboboxOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [category, setCategory] = useState("materials");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("bank_transfer");
  const [incurredAt, setIncurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [isCogs, setIsCogs] = useState(true);
  const [expNotes, setExpNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [expenseProjectId, setExpenseProjectId] = useState("");
  const [expenseEventId, setExpenseEventId] = useState("");
  const [projectOptions, setProjectOptions] = useState<ComboboxOption[]>([]);
  const [eventOptions, setEventOptions] = useState<ComboboxOption[]>([]);
  const [projectOptionsLoaded, setProjectOptionsLoaded] = useState(false);
  const [eventOptionsLoaded, setEventOptionsLoaded] = useState(false);

  // Edit form
  const [editing, setEditing] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIsCogs, setEditIsCogs] = useState(false);
  const [editNotes, setEditNotes] = useState("");

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchExpenses = useCallback(async () => {
    if (!USE_DATABASE) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (categoryFilter) params.set("category", categoryFilter);
      if (cogsFilter) params.set("isCogs", cogsFilter);
      params.set("limit", "50");

      const result = await apiRequest<{ data: ExpenseRecord[] }>(
        `/api/expenses?${params.toString()}`,
      );
      setExpenses(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryFilter, cogsFilter]);

  const fetchDetail = useCallback(async (id: string) => {
    if (!USE_DATABASE) return;
    try {
      const result = await apiRequest<{ data: ExpenseDetail }>(`/api/expenses/${id}`);
      setDetail(result.data);
    } catch {
      // Keep stale
    }
  }, []);

  const fetchSuppliers = useCallback(async () => {
    if (!USE_DATABASE) return;
    try {
      const result = await apiRequest<{ data: SupplierOption[] }>("/api/suppliers?limit=100");
      setSuppliers(result.data || []);
      setSupplierOptions(
        (result.data || []).map((s) => ({ value: s.id, label: s.name })),
      );
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    void fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    if (selectedId) void fetchDetail(selectedId);
  }, [selectedId, fetchDetail]);

  useEffect(() => {
    if (showCreate) void fetchSuppliers();
  }, [showCreate, fetchSuppliers]);

  // Auto-set COGS based on category (only if user hasn't manually toggled)
  const cogsCategories = new Set(["materials", "stones", "findings", "packaging", "labor"]);
  const cogsManuallySet = useRef(false);
  useEffect(() => {
    if (!cogsManuallySet.current) {
      setIsCogs(cogsCategories.has(category));
    }
  }, [category]);

  // Load project/event options for pickers (eager on create open)
  const loadProjectOptions = useCallback(async () => {
    if (projectOptionsLoaded) return;
    try {
      const result = await apiRequest<{ data: Array<{ id: string; projectNumber: string; title: string }> }>("/api/projects?limit=50");
      setProjectOptions((result.data || []).map((p) => ({ value: p.id, label: `${p.projectNumber} — ${p.title}` })));
      setProjectOptionsLoaded(true);
    } catch { /* ignore */ }
  }, [projectOptionsLoaded]);
  const loadEventOptions = useCallback(async () => {
    if (eventOptionsLoaded) return;
    try {
      const result = await apiRequest<{ data: Array<{ id: string; name: string; startsAt: string }> }>("/api/events?limit=50");
      setEventOptions((result.data || []).map((e) => ({ value: e.id, label: e.name })));
      setEventOptionsLoaded(true);
    } catch { /* ignore */ }
  }, [eventOptionsLoaded]);

  useEffect(() => {
    if (showCreate) {
      void loadProjectOptions();
      void loadEventOptions();
    }
  }, [showCreate, loadProjectOptions, loadEventOptions]);

  // ── Create handler ───────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!description || !amount) return;
    setSaving(true);
    setError(null);
    try {
      let sid = supplierId || null;

      // Create supplier inline if needed
      if (!sid && newSupplierName.trim()) {
        const supplierResult = await apiRequest<{ data: { id: string } }>(
          "/api/suppliers",
          {
            method: "POST",
            body: JSON.stringify({ name: newSupplierName.trim() }),
          },
        );
        sid = supplierResult.data.id;
        // Refresh supplier list
        setSuppliers((prev) => [
          ...prev,
          { id: sid!, name: newSupplierName.trim() },
        ]);
        setSupplierOptions((prev) => [
          ...prev,
          { value: sid!, label: newSupplierName.trim() },
        ]);
      }

      await apiRequest("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          supplierId: sid || undefined,
          projectId: expenseProjectId || undefined,
          eventId: expenseEventId || undefined,
          category,
          description: description.trim(),
          amountCents: Math.round(parseFloat(amount) * 100),
          method,
          incurredAt: new Date(incurredAt).toISOString(),
          isCogs,
          notes: expNotes.trim() || undefined,
        }),
      });

      setShowCreate(false);
      resetCreateForm();
      void fetchExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log expense");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedId || !editDescription || !editAmount) return;
    setSaving(true);
    setError(null);
    try {
      await apiRequest(`/api/expenses/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify({
          category: editCategory,
          description: editDescription.trim(),
          amountCents: Math.round(parseFloat(editAmount) * 100),
          isCogs: editIsCogs,
          notes: editNotes.trim() || undefined,
        }),
      });
      setEditing(false);
      void fetchDetail(selectedId);
      void fetchExpenses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update expense");
    } finally {
      setSaving(false);
    }
  };

  const resetCreateForm = () => {
    setSupplierId("");
    setNewSupplierName("");
    setShowNewSupplier(false);
    setCategory("materials");
    setDescription("");
    setAmount("");
    setMethod("bank_transfer");
    setIncurredAt(new Date().toISOString().slice(0, 10));
    setIsCogs(true);
    setExpNotes("");
    setExpenseProjectId("");
    setExpenseEventId("");
  };

  const startEdit = () => {
    if (!detail) return;
    setEditCategory(detail.category);
    setEditDescription(detail.description);
    setEditAmount(String(detail.amountCents / 100));
    setEditIsCogs(detail.isCogs);
    setEditNotes(detail.notes || "");
    setEditing(true);
  };

  // ── Computed ─────────────────────────────────────────────────────────────

  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + e.amountCents, 0),
    [expenses],
  );
  const cogsTotal = useMemo(
    () => expenses.filter((e) => e.isCogs).reduce((s, e) => s + e.amountCents, 0),
    [expenses],
  );
  const opexTotal = useMemo(
    () => expenses.filter((e) => !e.isCogs).reduce((s, e) => s + e.amountCents, 0),
    [expenses],
  );

  // ── Empty state ─────────────────────────────────────────────────────────

  if (!USE_DATABASE) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <Receipt size={32} className="text-accent/40" />
        <p className="text-[13px]">Configure database access to manage expenses.</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <MasterDetail
        hasSelection={!!selectedId}
        loading={loading}
        error={error}
        isEmpty={!loading && !error && expenses.length === 0}
        emptyState={
          <div className="p-8 text-center">
            <Receipt size={24} className="mx-auto text-accent/30 mb-2" />
            <p className="text-[13px] text-muted-foreground">No expenses logged</p>
          </div>
        }
        header={
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border bg-card">
            <p className="text-[11px] uppercase tracking-[0.22em] text-accent">Expenses</p>
            <button
              type="button"
              onClick={() => { void fetchSuppliers(); setShowCreate(true); }}
              className="inline-flex items-center gap-1.5 min-h-9 px-3 border border-border bg-card text-[12px] hover:border-accent/40 transition-colors"
            >
              <Plus size={13} /> Log expense
            </button>
          </div>
        }
        toolbar={
          <>
            <div className="relative flex-1 min-w-[140px] max-w-[280px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses…" className="w-full min-h-9 pl-8 pr-3 border border-border bg-card text-[13px] outline-none focus:border-accent/40" />
            </div>
            <Combobox options={[{ value: "", label: "All categories" }, ...CATEGORIES]} value={categoryFilter} onValueChange={setCategoryFilter} placeholder="Filter category…" searchPlaceholder="Search category…" aria-label="Filter by category" />
            <Combobox options={[{ value: "", label: "COGS & OPEX" }, { value: "true", label: "COGS only" }, { value: "false", label: "OPEX only" }]} value={cogsFilter} onValueChange={setCogsFilter} placeholder="COGS & OPEX" searchPlaceholder="Filter…" aria-label="Filter by COGS/OPEX" />
          </>
        }
        belowToolbar={
          <div className="flex flex-wrap items-center gap-4 px-4 sm:px-5 py-2 border-b border-border bg-muted/20 text-[12px]">
            <span><span className="text-muted-foreground">Total: </span><span className="tabular-nums font-medium">{php(totalExpenses / 100)}</span></span>
            <span><span className="text-muted-foreground">COGS: </span><span className="tabular-nums text-amber-700">{php(cogsTotal / 100)}</span></span>
            <span><span className="text-muted-foreground">OPEX: </span><span className="tabular-nums text-slate-600">{php(opexTotal / 100)}</span></span>
          </div>
        }
        sidebar={
          <>
            {expenses.map((exp) => (
              <button
                key={exp.id}
                type="button"
                onClick={() => { setSelectedId(exp.id); }}
                className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors ${selectedId === exp.id ? "bg-accent/5 border-l-2 border-l-accent" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-foreground truncate">{exp.description}</p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border rounded ${CATEGORY_STYLES[exp.category] || "bg-stone-100 text-stone-600 border-stone-200"}`}>{CATEGORY_LABELS[exp.category] || exp.category}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[13px] tabular-nums font-medium">{php(exp.amountCents / 100)}</p>
                  <div className="flex items-center gap-2">
                    {exp.isCogs && <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded">COGS</span>}
                    <span className="text-[10px] text-muted-foreground font-mono">{new Date(exp.incurredAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
                {exp.supplierName && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{exp.supplierName}</p>}
              </button>
            ))}
          </>
        }
        detail={
          detail ? (
            editing ? (
              <div className="flex-1 overflow-y-auto">
                <div className="px-4 sm:px-5 py-4 space-y-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-accent">Edit expense</p>
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Category</span>
                    <Combobox options={CATEGORIES} value={editCategory} onValueChange={setEditCategory} placeholder="Select category…" searchPlaceholder="Search category…" aria-label="Edit expense category" />
                  </label>
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Description</span>
                    <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="mt-1 w-full min-h-9 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40" />
                  </label>
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Amount (PHP)</span>
                    <input type="number" step="0.01" min="0" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="mt-1 w-full min-h-9 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40 tabular-nums" inputMode="decimal" />
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={editIsCogs} onChange={(e) => setEditIsCogs(e.target.checked)} className="accent-accent" />
                    <span className="text-[13px]">Cost of goods sold (COGS)</span>
                  </label>
                  <label className="block">
                    <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Notes</span>
                    <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} className="mt-1 w-full border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-accent/40 resize-none" />
                  </label>
                  {error && <p className="text-[12px] text-destructive">{error}</p>}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleUpdate} disabled={saving} className="min-h-9 px-4 bg-accent text-white text-[12px] hover:bg-accent-strong transition-colors disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button>
                    <button type="button" onClick={() => setEditing(false)} className="min-h-9 px-3 border border-border text-[12px] hover:border-accent/40 transition-colors">Cancel</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {/* Info bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-border bg-card">
                  <div>
                    <p className="text-[13px] font-medium">{detail.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border rounded ${CATEGORY_STYLES[detail.category] || ""}`}>{CATEGORY_LABELS[detail.category] || detail.category}</span>
                      {detail.isCogs && <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded">COGS</span>}
                      {!detail.isCogs && <span className="text-[10px] text-slate-600 bg-slate-50 px-1 rounded">OPEX</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={startEdit} className="min-h-8 px-3 border border-border text-[12px] hover:border-accent/40 transition-colors">Edit</button>
                    <span className="text-[15px] tabular-nums font-medium">{php(detail.amountCents / 100)}</span>
                  </div>
                </div>

                {/* Detail fields */}
                <div className="px-4 sm:px-5 py-4 space-y-3">
                  {detail.supplierName && (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Supplier</p>
                      <p className="text-[13px] mt-0.5">{detail.supplierName}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Date</p>
                      <p className="text-[13px] mt-0.5">{new Date(detail.incurredAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Method</p>
                      <p className="text-[13px] mt-0.5">{METHOD_LABELS[detail.method] || detail.method}</p>
                    </div>
                  </div>
                  {detail.notes && (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Notes</p>
                      <p className="text-[13px] mt-0.5 text-muted-foreground">{detail.notes}</p>
                    </div>
                  )}
                </div>

                {/* Activity timeline */}
                {detail.activity && (detail.activity as unknown[]).length > 0 && (
                  <div className="px-4 sm:px-5 py-3 border-t border-border">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2">Activity</p>
                    <div className="space-y-2">
                      {(detail.activity as Array<{ id: string; action: string; summary: string; createdAt: string }>).map((a) => (
                        <div key={a.id} className="flex items-start gap-2 text-[12px]">
                          <span className="text-muted-foreground shrink-0 mt-0.5">{new Date(a.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</span>
                          <span>{a.summary || a.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : null
        }
        noSelectionPlaceholder={
          <p className="text-[13px]">Select an expense or log a new one</p>
        }
      />

      {/* ── Create modal ─────────────────────────────────────────────────── */}
      {showCreate && (
        <Modal
          open={showCreate}
          onClose={() => { setShowCreate(false); resetCreateForm(); setError(null); }}
          title="Log expense"
          width={480}
          footer={
            <>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || !description || !amount}
                className="min-h-9 px-4 bg-accent text-white text-[12px] hover:bg-accent-strong transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Log expense"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); resetCreateForm(); setError(null); }}
                className="min-h-9 px-3 border border-border text-[12px] hover:border-accent/40 transition-colors"
              >
                Cancel
              </button>
            </>
          }
        >
          <div className="space-y-5">
              {/* Supplier */}
              <div>
                <span className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                  Supplier
                </span>
                {!showNewSupplier ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex-1">
                      <Combobox
                        options={supplierOptions}
                        value={supplierId}
                        onValueChange={setSupplierId}
                        placeholder="Search supplier…"
                        emptyMessage="No suppliers found"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewSupplier(true);
                        setSupplierId("");
                      }}
                      className="min-h-9 px-2 border border-border text-[11px] hover:border-accent/40 transition-colors shrink-0"
                    >
                      + New
                    </button>
                  </div>
                ) : (
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      placeholder="Supplier name…"
                      className="flex-1 min-h-9 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewSupplier(false);
                        setNewSupplierName("");
                      }}
                      className="min-h-9 px-2 border border-border text-[11px] hover:border-accent/40 transition-colors shrink-0"
                    >
                      Pick existing
                    </button>
                  </div>
                )}
              </div>

              {/* Category */}
              <label className="block">
                <span className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                  Category
                </span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1.5 w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Description */}
              <label className="block">
                <span className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                  Description *
                </span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 18K Gold Wire Restock"
                  className="mt-1.5 w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
                />
              </label>

              {/* Amount + Method */}
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                    Amount (PHP) *
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="mt-1.5 w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40 tabular-nums"
                    inputMode="decimal"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                    Method
                  </span>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="mt-1.5 w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
                  >
                    {Object.entries(METHOD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Date + COGS */}
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                    Date
                  </span>
                  <input
                    type="date"
                    value={incurredAt}
                    onChange={(e) => setIncurredAt(e.target.value)}
                    className="mt-1.5 w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">Type</span>
                  <select
                    value={isCogs ? "cogs" : "opex"}
                    onChange={(e) => {
                      cogsManuallySet.current = true;
                      setIsCogs(e.target.value === "cogs");
                    }}
                    className="mt-1.5 w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
                  >
                    <option value="cogs">COGS — Cost of Goods Sold</option>
                    <option value="opex">OPEX — Operating Expense</option>
                  </select>
                  <p className="mt-1 text-[10px] leading-[1.4] text-muted-foreground">
                    {isCogs
                      ? "Direct cost of goods sold — affects gross margin."
                      : "Operating expense — overhead, not tied to a sale."}
                  </p>
                </label>
              </div>

              {/* Project picker */}
              <label className="block">
                <span className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                  Project (optional)
                </span>
                <div className="mt-1.5">
                  <Combobox
                    options={projectOptions}
                    value={expenseProjectId}
                    onValueChange={setExpenseProjectId}
                    placeholder="Not project-specific…"
                    searchPlaceholder="Search projects…"
                    aria-label="Link to project"
                  />
                </div>
                <p className="mt-1 text-[10px] leading-[1.4] text-muted-foreground">
                  Link this expense to a project for per-project margin reporting.
                </p>
              </label>

              {/* Event picker */}
              <label className="block">
                <span className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                  Event (optional)
                </span>
                <div className="mt-1.5">
                  <Combobox
                    options={eventOptions}
                    value={expenseEventId}
                    onValueChange={setExpenseEventId}
                    placeholder="Not event-specific…"
                    searchPlaceholder="Search events…"
                    aria-label="Link to event"
                  />
                </div>
                <p className="mt-1 text-[10px] leading-[1.4] text-muted-foreground">
                  Link this expense to an event for event P&L reporting.
                </p>
              </label>

              {/* Notes */}
              <label className="block">
                <span className="text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                  Notes
                </span>
                <textarea
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  rows={2}
                  className="mt-1.5 w-full border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-accent/40 resize-none"
                />
              </label>

              {error && (
                <p className="text-[12px] text-destructive">{error}</p>
              )}
            </div>

        </Modal>
      )}
    </>
  );
}
