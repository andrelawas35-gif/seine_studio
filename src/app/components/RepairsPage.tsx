import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Wrench,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { apiRequest, ApiError } from "../api";
import { php } from "../data";
import { Combobox } from "./ui/combobox";
import { MasterDetail } from "./ui/master-detail";
import { Modal } from "./Modal";
import type { ClientRecord } from "../clients";

const STATUS_OPTIONS = [
  { value: "", label: "All tickets" },
  { value: "received", label: "Received" },
  { value: "assessed", label: "Assessed" },
  { value: "awaiting_approval", label: "Awaiting Approval" },
  { value: "in_service", label: "In Service" },
  { value: "waiting_for_parts", label: "Waiting for Parts" },
  { value: "quality_check", label: "Quality Check" },
  { value: "ready", label: "Ready" },
  { value: "released", label: "Released" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const STATUS_ICONS: Record<string, typeof Wrench> = {
  received: Clock,
  assessed: Wrench,
  awaiting_approval: Clock,
  in_service: Wrench,
  waiting_for_parts: Clock,
  quality_check: CheckCircle2,
  ready: CheckCircle2,
  released: CheckCircle2,
  cancelled: XCircle,
};

const STATUS_COLORS: Record<string, string> = {
  received: "#3D5A80",
  assessed: "#6A4C93",
  awaiting_approval: "#E09F3E",
  in_service: "#2D6A4F",
  waiting_for_parts: "#C73E1D",
  quality_check: "#3D5A80",
  ready: "#2D6A4F",
  released: "var(--ink-muted)",
  cancelled: "var(--ink-muted)",
};

const TRANSITIONS: Record<string, { value: string; label: string }[]> = {
  received: [
    { value: "assessed", label: "Assessed" },
    { value: "cancelled", label: "Cancel" },
  ],
  assessed: [
    { value: "awaiting_approval", label: "Awaiting Approval" },
    { value: "in_service", label: "In Service" },
    { value: "cancelled", label: "Cancel" },
  ],
  awaiting_approval: [
    { value: "in_service", label: "In Service" },
    { value: "cancelled", label: "Cancel" },
  ],
  in_service: [
    { value: "waiting_for_parts", label: "Waiting for Parts" },
    { value: "quality_check", label: "Quality Check" },
    { value: "cancelled", label: "Cancel" },
  ],
  waiting_for_parts: [
    { value: "in_service", label: "In Service" },
    { value: "cancelled", label: "Cancel" },
  ],
  quality_check: [
    { value: "ready", label: "Ready" },
    { value: "in_service", label: "Back to Service" },
    { value: "cancelled", label: "Cancel" },
  ],
  ready: [
    { value: "released", label: "Release" },
    { value: "cancelled", label: "Cancel" },
  ],
  released: [],
  cancelled: [],
};

interface RepairRecord {
  id: string;
  ticketNumber: string;
  clientId: string;
  clientName: string | null;
  pieceDescription: string;
  requestedWork: string;
  status: string;
  estimateCents: number | null;
  depositCents: number;
  promisedDate: string | null;
  currentLocationId: string | null;
  currentLocationName: string | null;
  createdAt: string;
}

interface RepairDetail extends RepairRecord {
  identifyingMarks: string | null;
  photosUrls: string[];
  receivedCondition: string | null;
  includedAccessories: string | null;
  releaseAcknowledgment: string | null;
  notes: string | null;
  pieceSku: string | null;
  catalogPieceId: string | null;
  catalogPieceName: string | null;
  projectId: string | null;
  projectName: string | null;
  updatedAt: string;
  events: {
    id: string;
    eventType: string;
    summary: string;
    fromStatus: string | null;
    toStatus: string | null;
    fromLocationName: string | null;
    toLocationName: string | null;
    displayName: string | null;
    notes: string | null;
    occurredAt: string;
  }[];
  activities: { id: string; action: string; summary: string; displayName: string | null; createdAt: string }[];
}

const USE_API = import.meta.env.VITE_DATA_MODE === "api";

export function RepairsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [records, setRecords] = useState<RepairRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RepairDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const fetchList = useCallback(async () => {
    if (!USE_API) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await apiRequest<{ data: RepairRecord[] }>(`/repairs?${params}`);
      setRecords(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load repair tickets");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const fetchDetail = useCallback(async (id: string) => {
    if (!USE_API) return;
    setDetailLoading(true);
    try {
      const res = await apiRequest<{ data: RepairDetail }>(`/repairs/${id}`);
      setDetail(res.data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      void fetchDetail(selectedId);
    } else {
      setDetail(null);
    }
  }, [selectedId, fetchDetail]);

  const handleSelect = (id: string) => setSelectedId(id === selectedId ? null : id);

  const handleTransition = async (newStatus: string) => {
    if (!detail || !USE_API) return;
    const notes = prompt("Notes (optional):") || undefined;
    const locId = prompt("Location ID (optional):") || undefined;
    setTransitioning(true);
    try {
      const res = await apiRequest<{ data: RepairRecord }>(
        `/repairs/${detail.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus, notes, locationId: locId || undefined }),
        },
      );
      setDetail((prev) => prev ? { ...prev, ...res.data, status: newStatus } : prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Status transition failed");
    } finally {
      setTransitioning(false);
    }
  };

  const isOverdue = (detail: RepairDetail) => {
    if (!detail.promisedDate) return false;
    if (detail.status === "released" || detail.status === "cancelled") return false;
    return new Date(detail.promisedDate) < new Date();
  };

  return (
    <>
      <MasterDetail
        hasSelection={!!selectedId}
        loading={loading}
        error={error}
        isEmpty={!loading && !error && records.length === 0}
        emptyState={
          <div className="p-6 text-center text-[13px]" style={{ color: "var(--ink-muted)" }}>
            No repair tickets found.
          </div>
        }
        header={
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-2">
            <div>
              <p className="text-eyebrow tracking-widest uppercase" style={{ color: "var(--accent)" }}>
                Repair &amp; Alteration Tickets
              </p>
              <h2 className="font-serif text-body-lg mt-0.5">Repairs</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 min-h-9 px-3 border border-border bg-card text-[12px] hover:border-accent/40 transition-colors"
            >
              <Plus size={13} />
              New Repair Ticket
            </button>
          </div>
        }
        toolbar={
          <>
            <div className="relative flex-1 min-w-[180px] max-w-[320px]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-muted)" }} />
              <input
                type="search"
                placeholder="Search repairs…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-8 pr-3 text-[13px] border border-border bg-transparent"
              />
            </div>
            <Combobox
              options={[...STATUS_OPTIONS]}
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
            {records.map((ticket) => {
              const Icon = STATUS_ICONS[ticket.status] || Wrench;
              const color = STATUS_COLORS[ticket.status] || "var(--ink-muted)";
              const overdue =
                ticket.promisedDate &&
                ticket.status !== "released" &&
                ticket.status !== "cancelled" &&
                new Date(ticket.promisedDate) < new Date();
              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => handleSelect(ticket.id)}
                  className="w-full text-left px-4 py-3 border-b border-border transition-colors hover:bg-[#FAF7F0]"
                  style={{ background: selectedId === ticket.id ? "var(--surface)" : "transparent" }}
                >
                  <div className="flex items-start gap-2.5">
                    <Icon size={15} style={{ color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium truncate">{ticket.pieceDescription}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-muted)" }}>
                        {ticket.ticketNumber}
                        {ticket.clientName ? ` · ${ticket.clientName}` : ""}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="inline-block text-[10px] px-1.5 py-0.5 font-medium uppercase tracking-wider"
                          style={{ color }}
                        >
                          {ticket.status.replace(/_/g, " ")}
                        </span>
                        {overdue && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-medium"
                            style={{ color: "var(--danger)" }}
                          >
                            <AlertTriangle size={10} />
                            Overdue
                          </span>
                        )}
                        {ticket.estimateCents != null && (
                          <span className="ml-auto font-mono text-[11px]" style={{ color: "var(--ink-muted)" }}>
                            {php(ticket.estimateCents / 100)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        }
        detail={
          detailLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={18} className="animate-spin" style={{ color: "var(--ink-muted)" }} />
            </div>
          ) : detail ? (
            <div className="flex-1 p-6 max-w-3xl">
              {/* Header */}
              <div className="flex items-start gap-3 mb-6">
                <div
                  className="flex items-center justify-center w-10 h-10 flex-shrink-0"
                  style={{ background: "var(--surface)" }}
                >
                  {isOverdue(detail) ? (
                    <AlertTriangle size={18} style={{ color: "var(--danger)" }} />
                  ) : (
                    (() => {
                      const Icon = STATUS_ICONS[detail.status] || Wrench;
                      return <Icon size={18} style={{ color: STATUS_COLORS[detail.status] }} />;
                    })()
                  )}
                </div>
                <div>
                  <p className="font-serif text-body-lg">{detail.pieceDescription}</p>
                  <p className="text-eyebrow tracking-widest uppercase" style={{ color: "var(--ink-muted)" }}>
                    {detail.ticketNumber} · {detail.clientName || "—"}
                    {isOverdue(detail) && " · Overdue"}
                  </p>
                </div>
              </div>

              {/* Status & Location */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[11px] px-2 py-0.5 font-medium uppercase tracking-wider"
                    style={{
                      color: STATUS_COLORS[detail.status],
                      background: `${STATUS_COLORS[detail.status]}10`,
                    }}
                  >
                    {detail.status.replace(/_/g, " ")}
                  </span>
                </div>
                {detail.currentLocationName && (
                  <div className="flex items-center gap-1 text-[12px]" style={{ color: "var(--ink-muted)" }}>
                    <MapPin size={12} />
                    {detail.currentLocationName}
                  </div>
                )}
                {detail.promisedDate && (
                  <div className="flex items-center gap-1 text-[12px]" style={{ color: "var(--ink-muted)" }}>
                    <Clock size={12} />
                    Promised: {new Date(detail.promisedDate).toLocaleDateString("en-PH")}
                  </div>
                )}
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <DetailField label="Requested Work" value={detail.requestedWork} />
                <DetailField label="Estimate" value={detail.estimateCents != null ? php(detail.estimateCents / 100) : "—"} />
                <DetailField label="Deposit" value={php(detail.depositCents / 100)} />
                <DetailField label="Linked Piece" value={detail.catalogPieceName ? `${detail.catalogPieceName} (${detail.pieceSku || "—"})` : "—"} />
                <DetailField label="Linked Project" value={detail.projectName || "—"} />
              </div>

              {detail.identifyingMarks && (
                <DetailField label="Identifying Marks" value={detail.identifyingMarks} />
              )}
              {detail.receivedCondition && (
                <DetailField label="Received Condition" value={detail.receivedCondition} />
              )}
              {detail.includedAccessories && (
                <DetailField label="Included Accessories" value={detail.includedAccessories} />
              )}
              {detail.releaseAcknowledgment && (
                <DetailField label="Release Acknowledgment" value={detail.releaseAcknowledgment} />
              )}

              {/* Status transitions */}
              {TRANSITIONS[detail.status]?.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {TRANSITIONS[detail.status].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => handleTransition(t.value)}
                      disabled={transitioning}
                      className="inline-flex items-center gap-1 min-h-9 px-3 text-[12px] font-medium border border-border transition-colors hover:bg-[#FAF7F0] disabled:opacity-50"
                    >
                      {transitioning ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : t.value === "cancelled" ? (
                        <XCircle size={11} />
                      ) : (
                        <CheckCircle2 size={11} />
                      )}
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Custody events */}
              {detail.events.length > 0 && (
                <div className="mt-8">
                  <p className="text-eyebrow tracking-widest uppercase mb-2" style={{ color: "var(--ink-muted)" }}>
                    Custody Trail
                  </p>
                  <div className="space-y-2">
                    {detail.events.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-start gap-3 text-[12px] py-1.5 border-b border-border"
                      >
                        <div className="min-w-[5rem]" style={{ color: "var(--ink-muted)" }}>
                          {new Date(ev.occurredAt).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="flex-1">
                          <p>{ev.summary}</p>
                          <div className="flex gap-3 mt-0.5" style={{ color: "var(--ink-muted)" }}>
                            {ev.fromLocationName && <span>From: {ev.fromLocationName}</span>}
                            {ev.toLocationName && <span>To: {ev.toLocationName}</span>}
                            {ev.displayName && <span>by {ev.displayName}</span>}
                          </div>
                          {ev.notes && <p className="mt-0.5 italic">{ev.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity */}
              {detail.activities.length > 0 && (
                <div className="mt-6">
                  <p className="text-eyebrow tracking-widest uppercase mb-2" style={{ color: "var(--ink-muted)" }}>
                    Activity
                  </p>
                  <div className="space-y-1.5">
                    {detail.activities.slice(0, 10).map((a) => (
                      <div key={a.id} className="flex items-center gap-2 text-[12px]">
                        <span style={{ color: "var(--ink-muted)" }}>
                          {new Date(a.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                        </span>
                        <span>{a.summary}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null
        }
        noSelectionPlaceholder={
          <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
            Select a repair ticket to view details
          </p>
        }
      />

      {/* Create Modal */}
      {showCreate && (
        <CreateRepairModal
          onClose={() => setShowCreate(false)}
          onCreated={(ticket) => {
            setRecords((prev) => [ticket, ...prev]);
            setShowCreate(false);
            setSelectedId(ticket.id);
          }}
        />
      )}
    </>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-eyebrow tracking-widest uppercase" style={{ color: "var(--ink-muted)" }}>
        {label}
      </p>
      <p className="text-[13px] mt-0.5 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

// ─── Create Modal ──────────────────────────────────────────────────────

function CreateRepairModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (ticket: RepairRecord) => void;
}) {
  const [clientId, setClientId] = useState("");
  const [catalogPieceId, setCatalogPieceId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [pieceDescription, setPieceDescription] = useState("");
  const [identifyingMarks, setIdentifyingMarks] = useState("");
  const [receivedCondition, setReceivedCondition] = useState("");
  const [includedAccessories, setIncludedAccessories] = useState("");
  const [requestedWork, setRequestedWork] = useState("");
  const [estimateCents, setEstimateCents] = useState("");
  const [depositCents, setDepositCents] = useState("0");
  const [promisedDate, setPromisedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [pieces, setPieces] = useState<{ id: string; name: string; sku: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; title: string; catalogPieceId: string | null }[]>([]);
  const [modalSaving, setModalSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!USE_API) return;
    void apiRequest<{ data: ClientRecord[] }>("/clients?limit=100").then((r) => setClients(r.data)).catch(() => {});
    void apiRequest<{ data: { id: string; name: string; sku: string }[] }>("/catalog?limit=100")
      .then((r) => setPieces(r.data))
      .catch(() => {});
    void apiRequest<{ data: { id: string; title: string; catalogPieceId: string | null }[] }>("/projects?limit=100")
      .then((r) => setProjects(r.data))
      .catch(() => {});
  }, []);

  // Auto-suggest project when piece is selected
  const suggestedProjects = catalogPieceId
    ? projects.filter((p) => p.catalogPieceId === catalogPieceId)
    : projects;

  const handleSubmit = async () => {
    if (!clientId) { setError("Client is required."); return; }
    if (!pieceDescription.trim()) { setError("Item description is required."); return; }
    if (!requestedWork.trim()) { setError("Requested work is required."); return; }
    if (!USE_API) return;
    setModalSaving(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: RepairRecord }>("/repairs", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          catalogPieceId: catalogPieceId || undefined,
          projectId: projectId || undefined,
          pieceDescription: pieceDescription.trim(),
          identifyingMarks: identifyingMarks.trim() || undefined,
          receivedCondition: receivedCondition.trim() || undefined,
          includedAccessories: includedAccessories.trim() || undefined,
          requestedWork: requestedWork.trim(),
          estimateCents: estimateCents ? Math.round(parseFloat(estimateCents) * 100) : undefined,
          depositCents: depositCents ? Math.round(parseFloat(depositCents) * 100) : 0,
          promisedDate: promisedDate ? new Date(promisedDate).toISOString() : undefined,
          notes: notes.trim() || undefined,
        }),
      });
      onCreated(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create repair ticket");
    } finally {
      setModalSaving(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="New Repair Ticket"
      width={520}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="min-h-9 px-4 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={modalSaving || !clientId || !pieceDescription.trim() || !requestedWork.trim()}
            className="min-h-9 px-5 text-[12px] font-medium bg-foreground text-card disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {modalSaving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Create Ticket
          </button>
        </>
      }
    >
      {error && (
        <p className="text-[12px] mb-3" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}

      <div className="space-y-3">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Client *</label>
            <Combobox
              value={clientId}
              onValueChange={setClientId}
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Search clients…"
              emptyMessage="No clients found"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Was this originally our piece?</label>
            <Combobox
              value={catalogPieceId}
              onValueChange={(id) => {
                setCatalogPieceId(id);
                // Auto-suggest project when piece selected
                if (id && !projectId) {
                  const matching = projects.filter((p) => p.catalogPieceId === id);
                  if (matching.length === 1) setProjectId(matching[0].id);
                }
              }}
              options={pieces.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
              placeholder="Search catalog pieces…"
              emptyMessage="No pieces found"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Link to Project</label>
            <Combobox
              value={projectId}
              onValueChange={setProjectId}
              options={suggestedProjects.map((p) => ({ value: p.id, label: p.title }))}
              placeholder="Search projects…"
              emptyMessage={catalogPieceId ? "No projects linked to this piece" : "No projects found"}
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Item Description *</label>
            <input
              type="text"
              value={pieceDescription}
              onChange={(e) => setPieceDescription(e.target.value)}
              className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
              placeholder="e.g., 18K Gold Ring with Diamond"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Requested Work *</label>
            <textarea
              value={requestedWork}
              onChange={(e) => setRequestedWork(e.target.value)}
              className="w-full border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-accent/40 resize-y"
              rows={2}
              placeholder="Describe what needs to be done…"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Identifying Marks</label>
            <input
              type="text"
              value={identifyingMarks}
              onChange={(e) => setIdentifyingMarks(e.target.value)}
              className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
              placeholder="Hallmarks, engravings, unique features…"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Received Condition</label>
            <textarea
              value={receivedCondition}
              onChange={(e) => setReceivedCondition(e.target.value)}
              className="w-full border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-accent/40 resize-y"
              rows={2}
              placeholder="Condition at intake…"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Included Accessories</label>
            <input
              type="text"
              value={includedAccessories}
              onChange={(e) => setIncludedAccessories(e.target.value)}
              className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
              placeholder="Box, certificate, pouch, extra stones…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Estimate (PHP)</label>
              <input
                type="number"
                value={estimateCents}
                onChange={(e) => setEstimateCents(e.target.value)}
                className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Deposit (PHP)</label>
              <input
                type="number"
                value={depositCents}
                onChange={(e) => setDepositCents(e.target.value)}
                className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
                placeholder="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Promised Date</label>
            <input
              type="date"
              value={promisedDate ? new Date(promisedDate).toISOString().slice(0, 10) : ""}
              onChange={(e) => setPromisedDate(e.target.value ? new Date(e.target.value).toISOString() : "")}
              className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-accent/40 resize-y"
              rows={2}
            />
          </div>
      </div>
    </Modal>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-eyebrow tracking-widest uppercase mb-1" style={{ color: "var(--ink-muted)" }}>
        {label}
      </p>
      {children}
    </div>
  );
}
