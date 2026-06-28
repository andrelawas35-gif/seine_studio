import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Lock, Plus, Search, X } from "lucide-react";
import { apiRequest } from "../api";
import { Combobox, type ComboboxOption } from "./ui/combobox";
import { MasterDetail } from "./ui/master-detail";
import { DocumentCanvas, DocumentLineTable, DocumentTotals, type DocumentMeta } from "./DocumentCanvas";
import { useDebouncedValue } from "./ui/use-debounced-value";
import { Modal } from "./Modal";
import { php } from "../data";

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string | null;
  projectId: string | null;
  status: string;
  totalCents: number;
  paidCents: number;
  dueDate: string | null;
  issuedAt: string;
}

interface PaymentRecord {
  id: string;
  invoiceId: string;
  amountCents: number;
  method: string;
  externalReference: string | null;
  feesCents: number;
  receivedAt: string;
  notes: string | null;
}

interface InvoiceDetail extends InvoiceRecord {
  projectTitle: string | null;
  quoteId: string | null;
  currency: string;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  depositPercent: number | null;
  paidAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  lineItemsSnapshot: Array<Record<string, unknown>> | null;
  notes: string | null;
  createdAt: string;
  payments: PaymentRecord[];
  balanceDueCents: number;
  activity: unknown[];
}

interface ClientOption {
  id: string;
  name: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
  refunded: "Refunded",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-blue-50 text-blue-800 border-blue-200",
  partially_paid: "bg-amber-50 text-amber-800 border-amber-200",
  paid: "bg-emerald-50 text-emerald-800 border-emerald-200",
  overdue: "bg-red-50 text-red-800 border-red-200",
  void: "bg-gray-100 text-gray-500 border-gray-200",
  refunded: "bg-violet-50 text-violet-800 border-violet-200",
};

const PAYMENT_METHODS: ComboboxOption[] = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card / Payment Link" },
  { value: "gcash", label: "GCash" },
  { value: "maya", label: "Maya" },
  { value: "other", label: "Other" },
];

const USE_DATABASE = import.meta.env.VITE_DATA_MODE === "api";

// ─── Component ───────────────────────────────────────────────────────────────

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  // Create form
  const [clientId, setClientId] = useState("");
  const [clientOptions, setClientOptions] = useState<ComboboxOption[]>([]);
  const [lineItems, setLineItems] = useState<Array<{ id: string; description: string; amountRaw: string }>>([
    { id: "1", description: "", amountRaw: "" },
  ]);
  const [discountRaw, setDiscountRaw] = useState("");
  const [taxRaw, setTaxRaw] = useState("");
  const [depositPct, setDepositPct] = useState(50);
  const [dueDate, setDueDate] = useState("");
  const [invNotes, setInvNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Computed from line items
  const subtotalCents = lineItems.reduce((sum, li) => sum + Math.round((parseFloat(li.amountRaw) || 0) * 100), 0);
  const discountCents = Math.round((parseFloat(discountRaw) || 0) * 100);
  const taxCents = Math.round((parseFloat(taxRaw) || 0) * 100);
  const totalCents = Math.max(0, subtotalCents - discountCents + taxCents);

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { id: crypto.randomUUID(), description: "", amountRaw: "" }]);
  };
  const removeLineItem = (id: string) => {
    setLineItems((prev) => (prev.length <= 1 ? prev : prev.filter((li) => li.id !== id)));
  };
  const updateLineItem = (id: string, field: "description" | "amountRaw", value: string) => {
    setLineItems((prev) => prev.map((li) => (li.id === id ? { ...li, [field]: value } : li)));
  };

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);

  const fetchInvoices = useCallback(async () => {
    if (!USE_DATABASE) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "50");
      const result = await apiRequest<{ data: InvoiceRecord[] }>(`/api/invoices?${params.toString()}`);
      setInvoices(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  const fetchDetail = useCallback(async (id: string) => {
    if (!USE_DATABASE) return;
    try {
      const result = await apiRequest<{ data: InvoiceDetail }>(`/api/invoices/${id}`);
      setDetail(result.data);
    } catch { /* keep stale */ }
  }, []);

  useEffect(() => { void fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => { if (selectedId) void fetchDetail(selectedId); }, [selectedId, fetchDetail]);

  const fetchClientsForCreate = async () => {
    const result = await apiRequest<{ data: ClientOption[] }>("/api/clients?limit=100");
    setClientOptions((result.data || []).map((c) => ({ value: c.id, label: c.name })));
  };

  const handleCreate = async () => {
    if (!clientId || totalCents <= 0) return;
    const validLines = lineItems.filter((li) => li.description.trim() && parseFloat(li.amountRaw) > 0);
    setSaving(true);
    try {
      await apiRequest("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          subtotalCents,
          discountCents,
          taxCents,
          totalCents,
          depositPercent: depositPct || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          notes: invNotes || undefined,
          lineItems: validLines.map((li) => ({
            description: li.description.trim(),
            amountCents: Math.round(parseFloat(li.amountRaw) * 100),
          })),
        }),
      });
      setShowCreate(false);
      resetCreateForm();
      void fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedId || !paymentAmount) return;
    setPaymentSaving(true);
    try {
      await apiRequest("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          invoiceId: selectedId,
          amountCents: Math.round(parseFloat(paymentAmount) * 100),
          method: paymentMethod,
          externalReference: paymentRef || undefined,
          receivedAt: new Date(paymentDate).toISOString(),
          notes: paymentNotes || undefined,
        }),
      });
      setShowPayment(false);
      resetPaymentForm();
      void fetchDetail(selectedId);
      void fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await apiRequest(`/api/invoices/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      void fetchDetail(id);
      void fetchInvoices();
    } catch { /* ignore */ }
  };

  const resetCreateForm = () => {
    setClientId("");
    setLineItems([{ id: "1", description: "", amountRaw: "" }]);
    setDiscountRaw("");
    setTaxRaw("");
    setDepositPct(50);
    setDueDate("");
    setInvNotes("");
  };

  const resetPaymentForm = () => {
    setPaymentAmount("");
    setPaymentMethod("bank_transfer");
    setPaymentRef("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentNotes("");
  };

  const docMeta: DocumentMeta | null = useMemo(() => {
    if (!detail) return null;
    return {
      kind: "Invoice",
      number: detail.invoiceNumber,
      date: detail.issuedAt ? new Date(detail.issuedAt).toLocaleDateString("en-PH", { day: "2-digit", month: "short", year: "numeric" }) : "",
      dateLabel: detail.dueDate ? "Due date" : undefined,
      dateSecondary: detail.dueDate ? new Date(detail.dueDate).toLocaleDateString("en-PH", { day: "2-digit", month: "short", year: "numeric" }) : undefined,
    };
  }, [detail]);

  const isInvoiceLocked = detail?.status === "sent" || detail?.status === "partially_paid" || detail?.status === "paid" || detail?.status === "overdue" || detail?.status === "void" || detail?.status === "refunded";

  if (!USE_DATABASE) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <FileText size={32} className="text-accent/40" />
        <p className="text-[13px]">Configure database access to manage invoices.</p>
      </div>
    );
  }

  return (
    <>
      <MasterDetail
        hasSelection={!!selectedId}
        loading={loading}
        error={error}
        isEmpty={!loading && !error && invoices.length === 0}
        emptyState={
          <div className="p-8 text-center">
            <FileText size={24} className="mx-auto text-accent/30 mb-2" />
            <p className="text-[13px] text-muted-foreground">No invoices yet</p>
          </div>
        }
        header={
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border bg-card">
            <p className="text-[11px] uppercase tracking-[0.22em] text-accent">Invoices</p>
            <button type="button" onClick={() => { void fetchClientsForCreate(); setShowCreate(true); }} className="inline-flex items-center gap-1.5 min-h-9 px-3 border border-border bg-card text-[12px] hover:border-accent/40 transition-colors">
              <Plus size={13} /> Create invoice
            </button>
          </div>
        }
        toolbar={
          <>
            <div className="relative flex-1 min-w-[160px] max-w-[320px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices…" className="w-full min-h-9 pl-8 pr-3 border border-border bg-card text-[13px] outline-none focus:border-accent/40" />
            </div>
            <Combobox
              options={[
                { value: "", label: "All statuses" },
                ...Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v })),
              ]}
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="Filter status…"
              searchPlaceholder="Search status…"
              aria-label="Filter by status"
            />
          </>
        }
        sidebar={
          <>
            {invoices.map((inv) => (
              <button key={inv.id} type="button" onClick={() => setSelectedId(inv.id)} className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors ${selectedId === inv.id ? "bg-accent/5 border-l-2 border-l-accent" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-foreground truncate">{inv.clientName || inv.invoiceNumber}</p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border rounded ${STATUS_STYLES[inv.status] || ""}`}>{STATUS_LABELS[inv.status] || inv.status}</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{inv.invoiceNumber}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[12px] tabular-nums font-medium">{php(inv.totalCents / 100)}</p>
                  {inv.paidCents > 0 && <p className="text-[11px] text-emerald-700">{php(inv.paidCents / 100)} paid</p>}
                </div>
              </button>
            ))}
          </>
        }
        detail={
          detail ? (
            <div className="flex-1 overflow-y-auto">
              {/* Info bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-border bg-card">
                <div>
                  <p className="text-[13px] font-medium">{detail.clientName}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{detail.invoiceNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isInvoiceLocked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium border border-amber-200 bg-amber-50 text-amber-700 rounded" title="This invoice is locked — only payments, void, or refund are allowed.">
                      <Lock size={10} />
                      Locked
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium border rounded ${STATUS_STYLES[detail.status] || ""}`}>{STATUS_LABELS[detail.status] || detail.status}</span>
                  <span className="text-[12px] tabular-nums font-medium">{php(detail.totalCents / 100)}</span>
                </div>
              </div>

              {/* Balance & Actions */}
              <div className="flex flex-wrap items-center gap-3 px-4 sm:px-5 py-3 border-b border-border bg-muted/20">
                {detail.balanceDueCents > 0 && detail.status !== "void" && detail.status !== "refunded" && (
                  <>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Balance Due</p>
                      <p className="text-[15px] font-medium text-foreground tabular-nums">{php(detail.balanceDueCents / 100)}</p>
                    </div>
                    <button type="button" onClick={() => { setPaymentAmount(String(detail.balanceDueCents / 100)); setShowPayment(true); }} className="min-h-9 px-3 border border-accent/40 bg-accent text-white text-[12px] hover:bg-accent-strong transition-colors">
                      Record payment
                    </button>
                  </>
                )}
                {detail.balanceDueCents <= 0 && detail.status === "paid" && (
                  <p className="text-[13px] text-emerald-700 font-medium">Fully paid</p>
                )}
                {detail.status === "draft" && (
                  <button type="button" onClick={() => handleStatusChange(detail.id, "sent")} className="text-[11px] text-accent hover:underline">Issue invoice</button>
                )}
                {!isInvoiceLocked && detail.status !== "draft" && (
                  <p className="text-[11px] text-muted-foreground">Draft — issue to lock</p>
                )}
                {(detail.status === "sent" || detail.status === "partially_paid" || detail.status === "overdue") && (
                  <button type="button" onClick={() => handleStatusChange(detail.id, "void")} className="text-[11px] text-destructive hover:underline">Void</button>
                )}
                {isInvoiceLocked && detail.status !== "void" && detail.status !== "refunded" && (
                  <span className="text-[10px] text-muted-foreground">Locked · payments only</span>
                )}
              </div>

              {/* Document preview */}
              <div className="p-4 sm:p-6">
                {docMeta && (
                  <DocumentCanvas meta={docMeta} onCopy={() => [`Invoice ${detail.invoiceNumber}`, `Client: ${detail.clientName}`, `Total: ${php(detail.totalCents / 100)}`, `Balance: ${php(detail.balanceDueCents / 100)}`].join("\n")}>
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: "#17140F" }}>{detail.clientName}</p>
                      {detail.depositPercent && <p style={{ fontSize: 12, color: "#7A6F5E", marginTop: 4 }}>{detail.depositPercent}% deposit required</p>}
                    </div>

                    {detail.lineItemsSnapshot && detail.lineItemsSnapshot.length > 0 ? (
                      <>
                        <DocumentLineTable
                          lines={detail.lineItemsSnapshot.map((item: Record<string, unknown>) => ({
                            description: String(item.description || ""),
                            quantity: item.quantity as number | undefined,
                            amount: Number(item.amountCents || item.amount || 0) / 100,
                            note: item.note as string | undefined,
                          }))}
                          currencyFormatter={(v) => php(v)}
                        />
                        <DocumentTotals
                          totals={[
                            { label: "Subtotal", value: detail.subtotalCents / 100 },
                            ...(detail.discountCents > 0 ? [{ label: "Discount", value: -detail.discountCents / 100 }] : []),
                            ...(detail.taxCents > 0 ? [{ label: "Tax", value: detail.taxCents / 100 }] : []),
                            { label: "Total", value: detail.totalCents / 100, bold: true, rule: "above" },
                            { label: "Paid", value: detail.paidCents / 100 },
                            { label: "Balance Due", value: detail.balanceDueCents / 100, bold: true, rule: "below" },
                          ]}
                          currencyFormatter={(v) => php(v)}
                        />
                      </>
                    ) : (
                      <div className="border border-dashed border-border p-8 text-center text-[12px] text-muted-foreground">
                        <p>No line items recorded.</p>
                      </div>
                    )}

                    {detail.notes && <p style={{ fontSize: 12, color: "#7A6F5E", marginTop: 24, fontStyle: "italic" }}>{detail.notes}</p>}
                  </DocumentCanvas>
                )}
              </div>

              {/* Payments history */}
              {detail.payments && detail.payments.length > 0 && (
                <div className="px-4 sm:px-6 py-4 border-t border-border">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Payments</p>
                  <div className="space-y-2">
                    {detail.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-[12px] bg-card border border-border px-3 py-2">
                        <div>
                          <p className="font-medium tabular-nums">{php(p.amountCents / 100)}</p>
                          <p className="text-[11px] text-muted-foreground">{PAYMENT_METHODS.find((m) => m.value === p.method)?.label || p.method} {p.externalReference && `· ${p.externalReference}`}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{new Date(p.receivedAt).toLocaleDateString("en-PH", { day: "2-digit", month: "short", year: "numeric" })}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity */}
              {detail.activity && detail.activity.length > 0 && (
                <div className="px-4 sm:px-6 py-4 border-t border-border">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Activity</p>
                  <div className="space-y-2">
                    {(detail.activity as Array<{ id: string; summary: string; createdAt: string }>).map((a) => (
                      <div key={a.id} className="flex items-start gap-2 text-[12px]">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-muted-foreground">{a.summary}</p>
                          <p className="text-[10px] text-muted-foreground/60">{new Date(a.createdAt).toLocaleDateString("en-PH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null
        }
        noSelectionPlaceholder={
          <p className="text-[13px]">Select an invoice or create a new one</p>
        }
      />

      {/* Create modal */}
      {showCreate && (
        <Modal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title="Create invoice"
          width={480}
          footer={
            <>
              <button type="button" onClick={() => setShowCreate(false)} className="min-h-9 px-4 text-[12px] text-muted-foreground hover:text-foreground">Cancel</button>
              <button type="button" onClick={handleCreate} disabled={!clientId || totalCents <= 0 || saving} className="min-h-9 px-4 border border-accent/40 bg-accent text-white text-[12px] disabled:opacity-40">{saving ? "Creating…" : "Create invoice"}</button>
            </>
          }
        >
          <div className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Client *</label>
                <Combobox options={clientOptions} value={clientId} onValueChange={setClientId} placeholder="Select client…" searchPlaceholder="Search clients…" emptyMessage="No clients found." />
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Line items</label>
                  <button type="button" onClick={addLineItem} className="text-[11px] text-accent hover:underline">+ Add line</button>
                </div>
                <div className="space-y-2">
                  {lineItems.map((li, i) => (
                    <div key={li.id} className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        {i === 0 && <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Description</span>}
                        <input
                          type="text"
                          value={li.description}
                          onChange={(e) => updateLineItem(li.id, "description", e.target.value)}
                          placeholder="E.g. Custom ring, 18K gold…"
                          className="w-full min-h-9 border border-border bg-card px-2 text-[12px] outline-none focus:border-accent/40"
                        />
                      </div>
                      <div className="w-28 space-y-1">
                        {i === 0 && <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Amount (₱)</span>}
                        <input
                          type="text"
                          inputMode="decimal"
                          value={li.amountRaw}
                          onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) updateLineItem(li.id, "amountRaw", v); }}
                          placeholder="0.00"
                          className="w-full min-h-9 border border-border bg-card px-2 text-[12px] outline-none focus:border-accent/40 tabular-nums"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineItem(li.id)}
                        disabled={lineItems.length <= 1}
                        className="mt-[18px] min-h-9 min-w-9 grid place-items-center text-muted-foreground hover:text-red-600 disabled:opacity-30"
                        aria-label="Remove line"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                {subtotalCents > 0 && (
                  <p className="mt-2 text-right text-[12px] text-muted-foreground tabular-nums">
                    Subtotal: {php(subtotalCents / 100)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Discount</label>
                  <input type="text" inputMode="decimal" value={discountRaw} onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setDiscountRaw(v); }} placeholder="0.00" className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40 tabular-nums" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Tax</label>
                  <input type="text" inputMode="decimal" value={taxRaw} onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setTaxRaw(v); }} placeholder="0.00" className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40 tabular-nums" />
                </div>
              </div>
              <p className="text-right text-[13px] font-medium tabular-nums">Total: {php(totalCents / 100)}</p>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Deposit %</label>
                <input type="number" min={0} max={100} value={depositPct} onChange={(e) => setDepositPct(Number(e.target.value))} className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Due date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Notes</label>
                <textarea value={invNotes} onChange={(e) => setInvNotes(e.target.value)} rows={2} className="w-full border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-accent/40 resize-none" />
              </div>
          </div>
        </Modal>
      )}

      {/* Payment modal */}
      {showPayment && (
        <Modal
          open={showPayment}
          onClose={() => setShowPayment(false)}
          title="Record payment"
          width={400}
          footer={
            <>
              <button type="button" onClick={() => setShowPayment(false)} className="min-h-9 px-4 text-[12px] text-muted-foreground hover:text-foreground">Cancel</button>
              <button type="button" onClick={handleRecordPayment} disabled={!paymentAmount || paymentSaving} className="min-h-9 px-4 border border-accent/40 bg-accent text-white text-[12px] disabled:opacity-40">{paymentSaving ? "Recording…" : "Record payment"}</button>
            </>
          }
        >
          <div className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Amount *</label>
                <input type="number" min={0.01} step={0.01} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Method</label>
                <Combobox options={PAYMENT_METHODS} value={paymentMethod} onValueChange={setPaymentMethod} placeholder="Select method…" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Reference</label>
                <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="E.g. transaction number" className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Date</label>
                <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Notes</label>
                <textarea value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} rows={2} className="w-full border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-accent/40 resize-none" />
              </div>
          </div>
        </Modal>
      )}
    </>
  );
}
