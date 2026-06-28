import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  FileCheck,
  ShieldCheck,
  ShieldX,
  RefreshCw,
  Printer,
  Copy,
  Loader2,
  FileText,
} from "lucide-react";
import { apiRequest, ApiError } from "../api";
import { php } from "../data";
import { Combobox } from "./ui/combobox";
import { MasterDetail } from "./ui/master-detail";
import { DocumentCanvas, type DocumentMeta } from "./DocumentCanvas";
import { Modal } from "./Modal";
import type { ClientRecord } from "../clients";

const STATUS_OPTIONS = [
  { value: "", label: "All certificates" },
  { value: "draft", label: "Draft" },
  { value: "issued", label: "Issued" },
  { value: "revoked", label: "Revoked" },
  { value: "reissued", label: "Reissued" },
] as const;

const STATUS_ICONS: Record<string, typeof FileCheck> = {
  draft: FileCheck,
  issued: ShieldCheck,
  revoked: ShieldX,
  reissued: RefreshCw,
};

const STATUS_COLORS: Record<string, string> = {
  draft: "var(--ink-muted)",
  issued: "#2D6A4F",
  revoked: "#C73E1D",
  reissued: "#3D5A80",
};

interface CertificateRecord {
  id: string;
  certificateNumber: string;
  catalogPieceId: string | null;
  pieceName: string;
  clientId: string | null;
  clientName: string | null;
  projectId: string | null;
  projectName: string | null;
  status: string;
  metalType: string | null;
  karat: string | null;
  stoneSpecifications: string | null;
  completionDate: string | null;
  verificationCode: string | null;
  createdAt: string;
}

interface CertificateDetail extends CertificateRecord {
  weightGrams: string | null;
  dimensions: string | null;
  careGuidance: string | null;
  signatory: string | null;
  revokedReason: string | null;
  notes: string | null;
  pieceSku: string | null;
  createdBy: string | null;
  updatedAt: string;
  revisions: { id: string; version: number; reason: string | null; displayName: string | null; createdAt: string }[];
  activities: { id: string; action: string; summary: string; displayName: string | null; createdAt: string }[];
}

const USE_API = import.meta.env.VITE_DATA_MODE === "api";

export function CertificatesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [records, setRecords] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CertificateDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchList = useCallback(async () => {
    if (!USE_API) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await apiRequest<{ data: CertificateRecord[] }>(`/certificates?${params}`);
      setRecords(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load certificates");
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
      const res = await apiRequest<{ data: CertificateDetail }>(`/certificates/${id}`);
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

  const StatusIcon = detail ? STATUS_ICONS[detail.status] : FileCheck;

  return (
    <>
      <MasterDetail
      hasSelection={!!selectedId}
      onBack={() => setSelectedId(null)}
      loading={loading}
      error={error}
      isEmpty={!loading && !error && records.length === 0}
      emptyState={
        <div className="p-6 text-center text-[13px]" style={{ color: "var(--ink-muted)" }}>
          No certificates found.
        </div>
      }
      header={
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-2">
          <div>
            <p className="text-eyebrow tracking-widest uppercase" style={{ color: "var(--accent)" }}>
              Certificates of Authenticity
            </p>
            <h2 className="font-serif text-body-lg mt-0.5">Certificates</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 min-h-9 px-3 border border-border bg-card text-[12px] hover:border-accent/40 transition-colors"
          >
            <Plus size={13} />
            New Certificate
          </button>
        </div>
      }
      toolbar={
        <>
          <div className="relative flex-1 min-w-[180px] max-w-[320px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-muted)" }} />
            <input
              type="search"
              placeholder="Search certificates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-3 text-[13px] border border-border bg-transparent"
              style={{ color: "var(--foreground)" }}
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
          {records.map((cert) => {
            const Icon = STATUS_ICONS[cert.status] || FileCheck;
            return (
              <button
                key={cert.id}
                type="button"
                onClick={() => handleSelect(cert.id)}
                className="w-full text-left px-4 py-3 border-b border-border transition-colors hover:bg-[#FAF7F0]"
                style={{ background: selectedId === cert.id ? "var(--surface)" : "transparent" }}
              >
                <div className="flex items-start gap-2.5">
                  <Icon size={15} style={{ color: STATUS_COLORS[cert.status] || "var(--ink-muted)" }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium truncate">{cert.pieceName}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-muted)" }}>
                      {cert.certificateNumber}
                      {cert.clientName ? ` · ${cert.clientName}` : ""}
                      {cert.projectName ? ` · ${cert.projectName}` : ""}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="inline-block text-[10px] px-1.5 py-0.5 font-medium uppercase tracking-wider"
                        style={{ color: STATUS_COLORS[cert.status] || "var(--ink-muted)" }}
                      >
                        {cert.status}
                      </span>
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
            {/* Status bar */}
            <div className="flex items-center gap-3 mb-6">
              <StatusIcon size={20} style={{ color: STATUS_COLORS[detail.status] }} />
              <div>
                <p className="font-serif text-body-lg">{detail.pieceName}</p>
                <p className="text-eyebrow tracking-widest uppercase" style={{ color: "var(--ink-muted)" }}>
                  {detail.certificateNumber}
                  {detail.status === "issued" || detail.status === "reissued"
                    ? ` · Verification: ${detail.verificationCode}`
                    : ""}
                </p>
              </div>
            </div>

            {/* Certificate fields */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <DetailField label="Status" value={detail.status} />
              <DetailField label="Client" value={detail.clientName || "—"} />
              <DetailField label="Project" value={detail.projectName || "—"} />
              <DetailField label="Piece SKU" value={detail.pieceSku || "—"} />
              <DetailField label="Metal" value={[detail.metalType, detail.karat].filter(Boolean).join(" ") || "—"} />
              <DetailField label="Weight" value={detail.weightGrams ? `${detail.weightGrams}g` : "—"} />
              <DetailField label="Dimensions" value={detail.dimensions || "—"} />
              {detail.completionDate && (
                <DetailField label="Completion" value={new Date(detail.completionDate).toLocaleDateString("en-PH")} />
              )}
            </div>

            {detail.stoneSpecifications && (
              <div className="mb-4">
                <p className="text-eyebrow tracking-widest uppercase mb-1" style={{ color: "var(--ink-muted)" }}>
                  Stone Specifications
                </p>
                <p className="text-[13px] whitespace-pre-wrap">{detail.stoneSpecifications}</p>
              </div>
            )}

            {detail.careGuidance && (
              <div className="mb-4">
                <p className="text-eyebrow tracking-widest uppercase mb-1" style={{ color: "var(--ink-muted)" }}>
                  Care Guidance
                </p>
                <p className="text-[13px] whitespace-pre-wrap">{detail.careGuidance}</p>
              </div>
            )}

            {detail.signatory && (
              <DetailField label="Signatory" value={detail.signatory} />
            )}

            {detail.revokedReason && (
              <div className="mt-4 p-3 border" style={{ borderColor: "var(--danger)", background: "rgba(199,62,29,0.04)" }}>
                <p className="text-eyebrow tracking-widest uppercase" style={{ color: "var(--danger)" }}>
                  Revocation Reason
                </p>
                <p className="text-[13px] mt-1">{detail.revokedReason}</p>
              </div>
            )}

            {/* Actions */}
            {detail.status === "draft" && (
              <div className="flex gap-2 mt-6">
                <ActionButton
                  label="Issue Certificate"
                  icon={Printer}
                  onClick={async () => {
                    if (!USE_API) return;
                    setActionLoading(true);
                    try {
                      const res = await apiRequest<{ data: CertificateRecord }>(
                        `/certificates/${detail.id}`,
                        { method: "PATCH", body: JSON.stringify({ status: "issued" }) },
                      );
                      setDetail((prev) => prev ? { ...prev, ...res.data, status: "issued" } : prev);
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  loading={actionLoading}
                />
                <ActionButton
                  label="Copy to Clipboard"
                  icon={Copy}
                  onClick={() => {
                    const text = `Certificate of Authenticity\n${detail.certificateNumber}\nPiece: ${detail.pieceName}\nMetal: ${[detail.metalType, detail.karat].filter(Boolean).join(" ")}\n${detail.stoneSpecifications ? `Stones: ${detail.stoneSpecifications}\n` : ""}`;
                    void navigator.clipboard.writeText(text);
                  }}
                />
              </div>
            )}
            {detail.status === "issued" && (
              <div className="flex gap-2 mt-6">
                <ActionButton
                  label="Revoke"
                  icon={ShieldX}
                  onClick={async () => {
                    const reason = prompt("Reason for revocation:");
                    if (!reason || !USE_API) return;
                    setActionLoading(true);
                    try {
                      const res = await apiRequest<{ data: CertificateRecord }>(
                        `/certificates/${detail.id}`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({ status: "revoked", revokedReason: reason }),
                        },
                      );
                      setDetail((prev) => prev ? { ...prev, ...res.data, status: "revoked", revokedReason: reason } : prev);
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  loading={actionLoading}
                  danger
                />
                <ActionButton
                  label="Copy"
                  icon={Copy}
                  onClick={() => {
                    const text = `Certificate #${detail.certificateNumber}\nVerification: ${detail.verificationCode}\nPiece: ${detail.pieceName}\nMetal: ${[detail.metalType, detail.karat].filter(Boolean).join(" ")}`;
                    void navigator.clipboard.writeText(text);
                  }}
                />
              </div>
            )}
            {detail.status === "revoked" && (
              <div className="flex gap-2 mt-6">
                <ActionButton
                  label="Reissue"
                  icon={RefreshCw}
                  onClick={async () => {
                    const reason = prompt("Reason for reissue:");
                    if (!reason || !USE_API) return;
                    setActionLoading(true);
                    try {
                      const res = await apiRequest<{ data: CertificateRecord }>(
                        `/certificates/${detail.id}`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({ status: "reissued", reason }),
                        },
                      );
                      setDetail((prev) => prev ? { ...prev, ...res.data, status: "reissued" } : prev);
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  loading={actionLoading}
                />
              </div>
            )}

            {/* DocumentCanvas — print/copy friendly certificate */}
            {detail && (detail.status === "issued" || detail.status === "reissued") && (
              <div className="mt-8 border-t border-border pt-6">
                <p className="text-eyebrow tracking-widest uppercase mb-3" style={{ color: "var(--ink-muted)" }}>
                  Document
                </p>
                <DocumentCanvas
                  meta={{
                    kind: "Certificate of Authenticity",
                    number: detail.certificateNumber,
                    date: detail.completionDate
                      ? new Date(detail.completionDate).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : new Date(detail.createdAt).toLocaleDateString("en-PH", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }),
                    dateLabel: "Date of completion",
                    masthead: "Seine Studio · Certificate of Authenticity",
                  }}
                  onCopy={() => {
                    const lines = [
                      "CERTIFICATE OF AUTHENTICITY",
                      `Certificate No: ${detail.certificateNumber}`,
                      `Verification Code: ${detail.verificationCode || "—"}`,
                      "",
                      `Piece: ${detail.pieceName}`,
                      `Metal: ${[detail.metalType, detail.karat].filter(Boolean).join(" ") || "—"}`,
                      `Weight: ${detail.weightGrams ? `${detail.weightGrams}g` : "—"}`,
                      detail.stoneSpecifications ? `Stones: ${detail.stoneSpecifications}` : "",
                      detail.dimensions ? `Dimensions: ${detail.dimensions}` : "",
                      detail.completionDate
                        ? `Completed: ${new Date(detail.completionDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`
                        : "",
                      detail.signatory ? `Signatory: ${detail.signatory}` : "",
                      detail.careGuidance ? `Care: ${detail.careGuidance}` : "",
                    ].filter(Boolean).join("\n");
                    return `Seine Studio\n${lines}`;
                  }}
                >
                  <div className="space-y-4 p-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                    <div className="text-center">
                      <h2 className="text-[18px] font-serif mb-1">Certificate of Authenticity</h2>
                      <p className="text-[11px] tracking-[0.2em] uppercase" style={{ color: "var(--ink-muted)" }}>
                        {detail.certificateNumber}
                      </p>
                    </div>
                    <div className="border-t border-b border-border/50 py-4 space-y-3">
                      <DocLine label="Piece" value={detail.pieceName} />
                      <DocLine label="Metal" value={[detail.metalType, detail.karat].filter(Boolean).join(" ") || "—"} />
                      {detail.stoneSpecifications && <DocLine label="Stones" value={detail.stoneSpecifications} />}
                      {detail.weightGrams && <DocLine label="Weight" value={`${detail.weightGrams}g`} />}
                      {detail.dimensions && <DocLine label="Dimensions" value={detail.dimensions} />}
                      {detail.completionDate && (
                        <DocLine
                          label="Completed"
                          value={new Date(detail.completionDate).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        />
                      )}
                      {detail.signatory && <DocLine label="Signatory" value={detail.signatory} />}
                      {detail.careGuidance && <DocLine label="Care" value={detail.careGuidance} />}
                      {detail.verificationCode && (
                        <DocLine label="Verification" value={detail.verificationCode} mono />
                      )}
                      {detail.clientName && <DocLine label="Client" value={detail.clientName} />}
                      {detail.projectName && <DocLine label="Project" value={detail.projectName} />}
                    </div>
                  </div>
                </DocumentCanvas>
              </div>
            )}

            {/* Revision history */}
            {detail.revisions.length > 0 && (
              <div className="mt-8">
                <p className="text-eyebrow tracking-widest uppercase mb-2" style={{ color: "var(--ink-muted)" }}>
                  Revision History
                </p>
                <div className="space-y-2">
                  {detail.revisions.map((rev) => (
                    <div key={rev.id} className="flex items-center gap-3 text-[12px]">
                      <span className="min-w-[3rem] font-mono text-[11px]" style={{ color: "var(--accent)" }}>
                        v{rev.version}
                      </span>
                      <span>{rev.reason || "—"}</span>
                      <span className="ml-auto" style={{ color: "var(--ink-muted)" }}>
                        {rev.displayName || "—"}
                      </span>
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
          Select a certificate to view details
        </p>
      }
    />

    {/* Create Modal */}
    {showCreate && (
      <CreateCertificateModal
        onClose={() => setShowCreate(false)}
        onCreated={(cert) => {
          setRecords((prev) => [cert, ...prev]);
          setShowCreate(false);
          setSelectedId(cert.id);
        }}
      />
    )}
  </>);
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-eyebrow tracking-widest uppercase" style={{ color: "var(--ink-muted)" }}>
        {label}
      </p>
      <p className="text-[13px] mt-0.5">{value}</p>
    </div>
  );
}

function DocLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-[11px] tracking-[0.12em] uppercase" style={{ color: "var(--ink-muted)" }}>
        {label}
      </span>
      <span
        className={`text-[13px] text-right ${mono ? "font-mono text-[11px]" : ""}`}
        style={{ fontFamily: mono ? "'DM Mono', monospace" : undefined }}
      >
        {value}
      </span>
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  loading,
  danger,
}: {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  onClick: () => void;
  loading?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 min-h-10 px-4 text-[13px] font-medium border transition-colors disabled:opacity-50"
      style={{
        borderColor: danger ? "var(--danger)" : "var(--foreground)",
        color: danger ? "var(--danger)" : "var(--foreground)",
      }}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
      {label}
    </button>
  );
}

// ─── Create Modal ──────────────────────────────────────────────────────

function CreateCertificateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (cert: CertificateRecord) => void;
}) {
  const [pieceName, setPieceName] = useState("");
  const [metalType, setMetalType] = useState("");
  const [karat, setKarat] = useState("");
  const [stoneSpecs, setStoneSpecs] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [completionDate, setCompletionDate] = useState("");
  const [careGuidance, setCareGuidance] = useState("");
  const [signatory, setSignatory] = useState("");
  const [notes, setNotes] = useState("");
  const [catalogPieceId, setCatalogPieceId] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [pieces, setPieces] = useState<{ id: string; name: string; sku: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!USE_API) return;
    void apiRequest<{ data: ClientRecord[] }>("/clients?limit=100").then((r) => setClients(r.data)).catch(() => {});
    void apiRequest<{ data: { id: string; name: string; sku: string }[] }>("/catalog?limit=100")
      .then((r) => setPieces(r.data))
      .catch(() => {});
    void apiRequest<{ data: { id: string; title: string }[] }>("/projects?limit=100")
      .then((r) => setProjects(r.data.map((p) => ({ id: p.id, name: p.title }))))
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!pieceName.trim()) {
      setError("Piece name is required.");
      return;
    }
    if (!USE_API) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiRequest<{ data: CertificateRecord }>("/certificates", {
        method: "POST",
        body: JSON.stringify({
          pieceName: pieceName.trim(),
          metalType: metalType.trim() || undefined,
          karat: karat.trim() || undefined,
          stoneSpecifications: stoneSpecs.trim() || undefined,
          weightGrams: weightGrams ? Number(weightGrams) : undefined,
          dimensions: dimensions.trim() || undefined,
          completionDate: completionDate || undefined,
          careGuidance: careGuidance.trim() || undefined,
          signatory: signatory.trim() || undefined,
          notes: notes.trim() || undefined,
          catalogPieceId: catalogPieceId || undefined,
          clientId: clientId || undefined,
          projectId: projectId || undefined,
        }),
      });
      onCreated(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create certificate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="New Certificate"
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
            disabled={saving || !pieceName.trim()}
            className="min-h-9 px-5 text-[12px] font-medium bg-foreground text-card disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            Create Certificate
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
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Piece Name *</label>
            <input
              type="text"
              value={pieceName}
              onChange={(e) => setPieceName(e.target.value)}
              className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
              placeholder="e.g., Serena Drop Earrings"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Metal</label>
              <input
                type="text"
                value={metalType}
                onChange={(e) => setMetalType(e.target.value)}
                className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
                placeholder="e.g., Sterling Silver"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Karat/Fineness</label>
              <input
                type="text"
                value={karat}
                onChange={(e) => setKarat(e.target.value)}
                className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
                placeholder="e.g., 18K"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Stone Specifications</label>
            <textarea
              value={stoneSpecs}
              onChange={(e) => setStoneSpecs(e.target.value)}
              className="w-full border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-accent/40 resize-y"
              rows={2}
              placeholder="Species, variety, carat, color, clarity, treatment disclosures…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Weight (grams)</label>
              <input
                type="number"
                step="0.001"
                value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
                className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
                placeholder="0.000"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Dimensions</label>
              <input
                type="text"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
                placeholder="e.g., 18mm × 8mm"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Completion Date</label>
            <input
              type="date"
              value={completionDate ? new Date(completionDate).toISOString().slice(0, 10) : ""}
              onChange={(e) => setCompletionDate(e.target.value ? new Date(e.target.value).toISOString() : "")}
              className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Care Guidance</label>
            <textarea
              value={careGuidance}
              onChange={(e) => setCareGuidance(e.target.value)}
              className="w-full border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-accent/40 resize-y"
              rows={2}
              placeholder="Care instructions…"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Signatory</label>
            <input
              type="text"
              value={signatory}
              onChange={(e) => setSignatory(e.target.value)}
              className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
              placeholder="e.g., Seine Studio"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Link to Catalog Piece</label>
            <Combobox
              value={catalogPieceId}
              onValueChange={setCatalogPieceId}
              options={pieces.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
              placeholder="Search pieces…"
              emptyMessage="No pieces found"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Link to Client</label>
            <Combobox
              value={clientId}
              onValueChange={setClientId}
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Search clients…"
              emptyMessage="No clients found"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Link to Project</label>
            <Combobox
              value={projectId}
              onValueChange={setProjectId}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Search projects…"
              emptyMessage="No projects found"
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
