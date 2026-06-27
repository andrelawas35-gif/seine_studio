import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Plus, Search, X } from "lucide-react";
import { apiRequest } from "../api";
import { Combobox, type ComboboxOption } from "./ui/combobox";
import { DocumentCanvas, DocumentLineTable, DocumentTotals, type DocumentMeta } from "./DocumentCanvas";
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
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  // Create form
  const [clientId, setClientId] = useState("");
  const [clientOptions, setClientOptions] = useState<ComboboxOption[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [depositPct, setDepositPct] = useState(50);
  const [dueDate, setDueDate] = useState("");
  const [invNotes, setInvNotes] = useState("");
  const [saving, setSaving] = useState(false);

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
      if (search) params.set("q", search);
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "50");
      const result = await apiRequest<{ data: InvoiceRecord[] }>(`/api/invoices?${params.toString()}`);
      setInvoices(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

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

  const totalCents = Math.max(0, subtotal - discount + tax);

  const handleCreate = async () => {
    if (!clientId || totalCents <= 0) return;
    setSaving(true);
    try {
      await apiRequest("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          subtotalCents: subtotal,
          discountCents: discount,
          taxCents: tax,
          totalCents,
          depositPercent: depositPct || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          notes: invNotes || undefined,
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
    setSubtotal(0);
    setDiscount(0);
    setTax(0);
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

  if (!USE_DATABASE) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <FileText size={32} className="text-accent/40" />
        <p className="text-[13px]">Configure database access to manage invoices.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border bg-card">
        <p className="text-[11px] uppercase tracking-[0.22em] text-accent">Invoices</p>
        <button type="button" onClick={() => { void fetchClientsForCreate(); setShowCreate(true); }} className="inline-flex items-center gap-1.5 min-h-9 px-3 border border-border bg-card text-[12px] hover:border-accent/40 transition-colors">
          <Plus size={13} /> Create invoice
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-3 border-b border-border bg-card">
        <div className="relative flex-1 min-w-[160px] max-w-[320px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices…" className="w-full min-h-9 pl-8 pr-3 border border-border bg-card text-[13px] outline-none focus:border-accent/40" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-h-9 border border-border bg-card px-2 text-[13px] outline-none">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* List */}
        <div className={`${selectedId && mobileView === "detail" ? "hidden" : "flex"} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-border overflow-y-auto`}>
          {loading && <p className="p-4 text-[12px] text-muted-foreground">Loading…</p>}
          {error && <p className="p-4 text-[12px] text-destructive">{error}</p>}
          {!loading && !error && invoices.length === 0 && (
            <div className="p-8 text-center">
              <FileText size={24} className="mx-auto text-accent/30 mb-2" />
              <p className="text-[13px] text-muted-foreground">No invoices yet</p>
            </div>
          )}
          {invoices.map((inv) => (
            <button key={inv.id} type="button" onClick={() => { setSelectedId(inv.id); setMobileView("detail"); }} className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors ${selectedId === inv.id ? "bg-accent/5 border-l-2 border-l-accent" : ""}`}>
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
        </div>

        {/* Detail */}
        <div className={`${mobileView === "list" ? "hidden" : "flex"} md:flex flex-1 flex-col overflow-y-auto`}>
          {!selectedId && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p className="text-[13px]">Select an invoice or create a new one</p>
            </div>
          )}

          {selectedId && detail && (
            <div className="flex-1 overflow-y-auto">
              <button type="button" onClick={() => setMobileView("list")} className="md:hidden flex items-center gap-1 px-4 py-2 text-[12px] text-accent border-b border-border">
                ← Back to list
              </button>

              {/* Info bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-border bg-card">
                <div>
                  <p className="text-[13px] font-medium">{detail.clientName}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{detail.invoiceNumber}</p>
                </div>
                <div className="flex items-center gap-2">
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
                  <button type="button" onClick={() => handleStatusChange(detail.id, "sent")} className="text-[11px] text-accent hover:underline">Mark sent</button>
                )}
                {(detail.status === "sent" || detail.status === "partially_paid" || detail.status === "overdue") && (
                  <button type="button" onClick={() => handleStatusChange(detail.id, "void")} className="text-[11px] text-destructive hover:underline">Void</button>
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
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowCreate(false)}>
          <div className="bg-card border border-border shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="text-[13px] font-medium">Create invoice</p>
              <button type="button" onClick={() => setShowCreate(false)} className="p-1"><X size={15} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Client *</label>
                <Combobox options={clientOptions} value={clientId} onValueChange={setClientId} placeholder="Select client…" searchPlaceholder="Search clients…" emptyMessage="No clients found." />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Subtotal</label>
                  <input type="number" min={0} value={subtotal || ""} onChange={(e) => setSubtotal(Math.round(parseFloat(e.target.value || "0") * 100))} className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Discount</label>
                  <input type="number" min={0} value={discount || ""} onChange={(e) => setDiscount(Math.round(parseFloat(e.target.value || "0") * 100))} className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Tax</label>
                  <input type="number" min={0} value={tax || ""} onChange={(e) => setTax(Math.round(parseFloat(e.target.value || "0") * 100))} className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40" />
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
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
              <button type="button" onClick={() => setShowCreate(false)} className="min-h-9 px-4 text-[12px] text-muted-foreground hover:text-foreground">Cancel</button>
              <button type="button" onClick={handleCreate} disabled={!clientId || totalCents <= 0 || saving} className="min-h-9 px-4 border border-accent/40 bg-accent text-white text-[12px] disabled:opacity-40">{saving ? "Creating…" : "Create invoice"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowPayment(false)}>
          <div className="bg-card border border-border shadow-xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="text-[13px] font-medium">Record payment</p>
              <button type="button" onClick={() => setShowPayment(false)} className="p-1"><X size={15} /></button>
            </div>
            <div className="p-5 space-y-4">
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
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
              <button type="button" onClick={() => setShowPayment(false)} className="min-h-9 px-4 text-[12px] text-muted-foreground hover:text-foreground">Cancel</button>
              <button type="button" onClick={handleRecordPayment} disabled={!paymentAmount || paymentSaving} className="min-h-9 px-4 border border-accent/40 bg-accent text-white text-[12px] disabled:opacity-40">{paymentSaving ? "Recording…" : "Record payment"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
