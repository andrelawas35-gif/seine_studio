import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Plus, Search, Copy, Printer, ArrowRight, X, Lock, Rocket } from "lucide-react";
import { useNavigate } from "react-router";
import { apiRequest } from "../api";
import { Combobox, type ComboboxOption } from "./ui/combobox";
import { MasterDetail } from "./ui/master-detail";
import { DocumentCanvas, DocumentLineTable, DocumentTotals, type DocumentMeta } from "./DocumentCanvas";
import { QuotePricingPanel } from "./QuotePricingPanel";
import { Modal } from "./Modal";
import { php } from "../data";
import { format, parseISO } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuoteRecord {
  id: string;
  quoteNumber: string;
  clientId: string;
  clientName: string | null;
  projectId: string | null;
  status: string;
  depositPercent: number | null;
  validUntil: string | null;
  createdAt: string;
}

interface QuoteDetail extends QuoteRecord {
  projectTitle: string | null;
  pricingVersionId: string | null;
  terms: string | null;
  acceptedAt: string | null;
  notes: string | null;
  updatedAt: string;
  versions: QuoteVersion[];
  activity: unknown[];
}

interface QuoteVersion {
  id: string;
  version: number;
  snapshot: Record<string, unknown>;
  createdAt: string;
}

interface ClientOption {
  id: string;
  name: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
  converted: "Converted",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  sent: "bg-blue-50 text-blue-800 border-blue-200",
  viewed: "bg-violet-50 text-violet-800 border-violet-200",
  accepted: "bg-emerald-50 text-emerald-800 border-emerald-200",
  declined: "bg-red-50 text-red-800 border-red-200",
  expired: "bg-amber-50 text-amber-800 border-amber-200",
  converted: "bg-emerald-100 text-emerald-900 border-emerald-300",
};

interface QuoteListResponse {
  data: QuoteRecord[];
  pagination: { limit: number; offset: number; total: number };
}

interface QuoteDetailResponse {
  data: QuoteDetail;
}

interface ClientListResponse {
  data: ClientOption[];
  pagination: { limit: number; offset: number; total: number };
}

const USE_DATABASE = import.meta.env.VITE_DATA_MODE === "api";

// ─── Component ───────────────────────────────────────────────────────────────

export function QuotesPage() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<QuoteDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [converting, setConverting] = useState(false);

  // ── Create form state
  const [clientId, setClientId] = useState("");
  const [clientOptions, setClientOptions] = useState<ComboboxOption[]>([]);
  const [depositPercent, setDepositPercent] = useState(50);
  const [validUntil, setValidUntil] = useState("");
  const [terms, setTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchQuotes = useCallback(async () => {
    if (!USE_DATABASE) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter) params.set("status", statusFilter);
      params.set("limit", "50");

      const result = await apiRequest<QuoteListResponse>(`/api/quotes?${params.toString()}`);
      setQuotes(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quotes");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const fetchDetail = useCallback(async (id: string) => {
    if (!USE_DATABASE) return;
    try {
      const result = await apiRequest<QuoteDetailResponse>(`/api/quotes/${id}`);
      setDetail(result.data);
    } catch {
      // Keep stale detail
    }
  }, []);

  const fetchClients = useCallback(async () => {
    if (!USE_DATABASE) return;
    try {
      const result = await apiRequest<ClientListResponse>("/api/clients?limit=100");
      setClientOptions((result.data || []).map((c) => ({ value: c.id, label: c.name })));
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    void fetchQuotes();
  }, [fetchQuotes]);

  useEffect(() => {
    if (selectedId) void fetchDetail(selectedId);
  }, [selectedId, fetchDetail]);

  useEffect(() => {
    if (showCreate) void fetchClients();
  }, [showCreate, fetchClients]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleCreate = async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      await apiRequest<{ data: QuoteRecord }>("/api/quotes", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          depositPercent: depositPercent || undefined,
          validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
          terms: terms || undefined,
          notes: notes || undefined,
        }),
      });
      setShowCreate(false);
      resetForm();
      void fetchQuotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create quote");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (!USE_DATABASE) return;
    try {
      await apiRequest<{ data: QuoteRecord }>(`/api/quotes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      void fetchDetail(id);
      void fetchQuotes();
    } catch {
      // Ignore
    }
  };

  // ── Convert to project (F3.2) ──────────────────────────────────────
  const handleConvertToProject = async () => {
    if (!detail || !USE_DATABASE) return;
    setConverting(true);
    try {
      const latestSnap = detail.versions?.[detail.versions.length - 1]?.snapshot;
      const snap = (latestSnap && typeof latestSnap === "object" ? latestSnap as Record<string, unknown> : null);
      const pieceName = (snap?.pieceName as string) || "";
      const projectTitle = pieceName || `${detail.clientName || "Client"} commission`;

      const res = await apiRequest<{ data: { id: string; projectNumber: string } }>("/api/quotes/convert", {
        method: "POST",
        body: JSON.stringify({
          quoteId: detail.id,
          clientId: detail.clientId,
          title: projectTitle,
          brief: detail.notes || undefined,
          depositPercent: detail.depositPercent,
          catalogPieceId: (snap?.pieceId as string) || undefined,
        }),
      });

      // Mark quote as converted
      await apiRequest(`/api/quotes/${detail.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "converted" }),
      });

      void fetchQuotes();
      navigate(`/projects/${res.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert quote to project");
    } finally {
      setConverting(false);
    }
  };

  const resetForm = () => {
    setClientId("");
    setDepositPercent(50);
    setValidUntil("");
    setTerms("");
    setNotes("");
  };

  // ── Document meta for DocumentCanvas
  const docMeta: DocumentMeta | null = useMemo(() => {
    if (!detail) return null;
    return {
      kind: "Quote",
      number: detail.quoteNumber,
      date: detail.createdAt
        ? format(parseISO(detail.createdAt), "dd MMM yyyy")
        : "",
      dateLabel: detail.validUntil ? "Valid until" : undefined,
      dateSecondary: detail.validUntil
        ? format(parseISO(detail.validUntil), "dd MMM yyyy")
        : undefined,
      masthead: detail.terms || undefined,
    };
  }, [detail]);

  const latestSnapshot = detail?.versions?.[detail.versions.length - 1]?.snapshot;

  const isLocked = detail?.status === "accepted" || detail?.status === "converted" || detail?.status === "declined" || detail?.status === "expired";
  const isEditable = detail?.status === "draft" || detail?.status === "sent" || detail?.status === "viewed";

  // ── Empty state
  if (!USE_DATABASE) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <FileText size={32} className="text-accent/40" />
        <p className="text-[13px]">Configure database access to manage quotes.</p>
      </div>
    );
  }

  return (
    <>
      <MasterDetail
        hasSelection={!!selectedId}
        onBack={() => { setSelectedId(null); }}
        loading={loading}
        error={error}
        isEmpty={!loading && !error && quotes.length === 0}
        emptyState={
          <div className="p-8 text-center">
            <FileText size={24} className="mx-auto text-accent/30 mb-2" />
            <p className="text-[13px] text-muted-foreground">No quotes yet</p>
          </div>
        }
        header={
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-border bg-card">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-accent">Quotes</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 min-h-9 px-3 border border-border bg-card text-[12px] hover:border-accent/40 transition-colors"
            >
              <Plus size={13} />
              Create quote
            </button>
          </div>
        }
        toolbar={
          <>
            <div className="relative flex-1 min-w-[160px] max-w-[320px]">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search quotes..."
                className="w-full min-h-9 pl-8 pr-3 border border-border bg-card text-[13px] outline-none focus:border-accent/40"
              />
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
            {quotes.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => handleSelect(q.id)}
                className={`w-full text-left px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors ${selectedId === q.id ? "bg-accent/5 border-l-2 border-l-accent" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-foreground truncate">{q.clientName || q.quoteNumber}</p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium border rounded ${STATUS_STYLES[q.status] || ""}`}>
                    {STATUS_LABELS[q.status] || q.status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{q.quoteNumber}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {q.createdAt ? format(parseISO(q.createdAt), "dd MMM yyyy") : ""}
                </p>
              </button>
            ))}
          </>
        }
        detail={
          detail ? (
            <div className="flex-1 overflow-y-auto">
              {/* Quote info bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-border bg-card">
                <div>
                  <p className="text-[13px] font-medium">{detail.clientName}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{detail.quoteNumber}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isLocked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium border border-amber-200 bg-amber-50 text-amber-700 rounded" title="This quote is locked — changes are not allowed.">
                      <Lock size={10} />
                      Locked
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium border rounded ${STATUS_STYLES[detail.status] || ""}`}>
                    {STATUS_LABELS[detail.status] || detail.status}
                  </span>
                  {detail.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(detail.id, "sent")}
                      className="text-[11px] text-accent hover:underline"
                    >
                      Mark sent
                    </button>
                  )}
                  {detail.status === "sent" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(detail.id, "accepted")}
                      className="text-[11px] text-emerald-700 hover:underline"
                    >
                      Accept
                    </button>
                  )}
                  {detail.status === "accepted" && (
                    <button
                      type="button"
                      onClick={handleConvertToProject}
                      disabled={converting}
                      className="inline-flex items-center gap-1.5 min-h-9 px-3 border border-accent/40 bg-accent text-white text-[11px] disabled:opacity-40 transition-opacity"
                    >
                      <Rocket size={12} />
                      {converting ? "Converting…" : "Convert to project"}
                    </button>
                  )}
                </div>
              </div>

              {/* Locked banner */}
              {isLocked && (
                <div className="px-4 sm:px-5 py-2.5 border-b border-amber-200 bg-amber-50 text-[11px] text-amber-800 flex items-center gap-2">
                  <Lock size={12} />
                  This quote has been {detail.status}. Pricing and terms can no longer be changed.
                  {detail.status === "accepted" && " Convert it to a project to begin billing."}
                </div>
              )}

              {/* Pricing editor (editable quotes) or locked snapshot */}
              {isEditable ? (
                <QuotePricingPanel
                  key={detail.versions?.length ?? 0}
                  quoteId={detail.id}
                  quoteNumber={detail.quoteNumber}
                  clientName={detail.clientName}
                  existingSnapshot={latestSnapshot}
                  locked={false}
                  onVersionSaved={() => { void fetchDetail(detail.id); }}
                />
              ) : (
                <div className="p-4 sm:p-6">
                  {docMeta && (
                    <DocumentCanvas
                      meta={docMeta}
                      onCopy={() => {
                        const snap = latestSnapshot && typeof latestSnapshot === "object" ? latestSnapshot as Record<string, unknown> : null;
                        const totals = snap?.totals as Record<string, number> | undefined;
                        const lines = Array.isArray(snap?.lines) ? snap.lines as Array<{ description: string; quantity?: number; unitCostCentavos?: number }> : [];
                        const pieceName = (snap?.pieceName as string) || "";
                        return [
                          `Quote ${detail.quoteNumber}`,
                          `Client: ${detail.clientName}`,
                          pieceName ? `Piece: ${pieceName}` : "",
                          "",
                          ...lines.map((l) => {
                            const total = (l.quantity || 1) * (l.unitCostCentavos || 0);
                            return `${l.description}: ${php(total / 100)}`;
                          }),
                          "",
                          totals ? `Total cost: ${php(totals.totalCostCentavos / 100)}` : "",
                          totals ? `Selling price: ${php(totals.sellingPriceCentavos / 100)}` : "",
                        ].filter(Boolean).join("\n");
                      }}
                    >
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: "#17140F" }}>
                          {detail.clientName}
                        </p>
                        {detail.terms && (
                          <p style={{ fontSize: 12, color: "#7A6F5E", marginTop: 4 }}>{detail.terms}</p>
                        )}
                      </div>

                      {latestSnapshot && typeof latestSnapshot === "object" ? (
                        <>
                          <DocumentLineTable
                            lines={(Array.isArray((latestSnapshot as Record<string, unknown>).lines)
                              ? ((latestSnapshot as Record<string, unknown>).lines as Array<{
                                  description: string;
                                  quantity?: number;
                                  unitCostCentavos?: number;
                                  category?: string;
                                }>).map((l) => ({
                                  description: l.description,
                                  quantity: l.quantity,
                                  amount: ((l.quantity || 1) * (l.unitCostCentavos || 0)) / 100,
                                  note: l.category,
                                }))
                              : [])}
                            currencyFormatter={(v) => php(v)}
                          />
                          {(latestSnapshot as Record<string, unknown>).totals && (
                            <DocumentTotals
                              totals={(() => {
                                const t = (latestSnapshot as Record<string, unknown>).totals as Record<string, number>;
                                const lines: Array<{ label: string; value: number; bold?: boolean; rule?: "above" | "below" }> = [
                                  { label: "Total cost", value: t.totalCostCentavos / 100 },
                                ];
                                if (t.markupCentavos > 0) lines.push({ label: "Markup", value: t.markupCentavos / 100 });
                                if (t.discountCentavos > 0) lines.push({ label: "Discount", value: -t.discountCentavos / 100 });
                                lines.push({ label: "Selling price", value: t.sellingPriceCentavos / 100, bold: true, rule: "above" });
                                if (t.grossProfitCentavos !== undefined) {
                                  lines.push({ label: "Gross profit", value: t.grossProfitCentavos / 100 });
                                }
                                return lines;
                              })()}
                              currencyFormatter={(v) => php(v)}
                            />
                          )}
                        </>
                      ) : (
                        <div className="border border-dashed border-border p-8 text-center text-[12px] text-muted-foreground">
                          <p>No line items recorded.</p>
                        </div>
                      )}

                      {detail.depositPercent && (
                        <div style={{ marginTop: 24, paddingTop: 12, borderTop: "1px solid rgba(23,20,15,0.08)" }}>
                          <p style={{ fontSize: 12, color: "#7A6F5E" }}>
                            {detail.depositPercent}% deposit required to begin production.
                          </p>
                        </div>
                      )}

                      {detail.notes && (
                        <p style={{ fontSize: 12, color: "#7A6F5E", marginTop: 12, fontStyle: "italic" }}>
                          {detail.notes}
                        </p>
                      )}
                    </DocumentCanvas>
                  )}
                </div>
              )}

              {/* Activity timeline */}
              {detail.activity && detail.activity.length > 0 && (
                <div className="px-4 sm:px-6 py-4 border-t border-border">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">Activity</p>
                  <div className="space-y-2">
                    {(detail.activity as Array<{ id: string; action: string; summary: string; createdAt: string }>).map((a) => (
                      <div key={a.id} className="flex items-start gap-2 text-[12px]">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-muted-foreground">{a.summary}</p>
                          <p className="text-[10px] text-muted-foreground/60">
                            {a.createdAt ? format(parseISO(a.createdAt), "dd MMM yyyy HH:mm") : ""}
                          </p>
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
          <p className="text-[13px]">Select a quote or create a new one</p>
        }
      />

      {/* ── Create modal ───────────────────────────────────────────────── */}
      {showCreate && (
        <Modal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title="Create quote"
          width={480}
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="min-h-9 px-4 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!clientId || saving}
                className="min-h-9 px-4 border border-accent/40 bg-accent text-white text-[12px] disabled:opacity-40 transition-opacity"
              >
                {saving ? "Creating…" : "Create quote"}
              </button>
            </>
          }
        >
          <div className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Client *</label>
                <Combobox
                  options={clientOptions}
                  value={clientId}
                  onValueChange={setClientId}
                  placeholder="Select client..."
                  searchPlaceholder="Search clients..."
                  emptyMessage="No clients found."
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Deposit %</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={depositPercent}
                  onChange={(e) => setDepositPercent(Number(e.target.value))}
                  className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Valid until</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Terms</label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={2}
                  className="w-full border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-accent/40 resize-none"
                  placeholder="E.g. 50% deposit, balance on delivery"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-accent/40 resize-none"
                />
              </div>
          </div>
        </Modal>
      )}
    </>
  );
}
