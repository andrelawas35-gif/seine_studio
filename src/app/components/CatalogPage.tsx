import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  ImageOff,
  Package,
  FolderOpen,
  ScrollText,
  ShoppingBag,
  Loader2,
  Pencil,
  X,
  Wrench,
} from "lucide-react";
import { apiRequest, ApiError } from "../api";
import { php } from "../data";
import { Combobox } from "./ui/combobox";
import { MasterDetail } from "./ui/master-detail";
import { Modal } from "./Modal";

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: "", label: "All categories" },
  { value: "Ring", label: "Ring" },
  { value: "Necklace", label: "Necklace" },
  { value: "Earrings", label: "Earrings" },
  { value: "Bracelet", label: "Bracelet" },
  { value: "Pendant", label: "Pendant" },
  { value: "Brooch", label: "Brooch" },
  { value: "Other", label: "Other" },
] as const;

const CATEGORY_FORM_OPTIONS = CATEGORY_OPTIONS.filter((o) => o.value !== "");

const STAGE_DOT_COLORS: Record<string, string> = {
  inquiry: "#7A6F5E",
  design: "#B8975A",
  approved: "#3D5A80",
  production: "#E09F3E",
  quality_control: "#9B5DE5",
  ready: "#2D6A4F",
  delivered: "#2D6A4F",
  cancelled: "#C73E1D",
};

const STAGE_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  design: "Design",
  approved: "Approved",
  production: "Production",
  quality_control: "QC",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const CERT_STATUS_COLORS: Record<string, string> = {
  draft: "var(--ink-muted)",
  issued: "#2D6A4F",
  revoked: "#C73E1D",
  reissued: "#3D5A80",
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface CatalogPiece {
  id: string;
  sku: string;
  name: string;
  category: string;
  collection: string | null;
  metalType: string | null;
  karat: string | null;
  stoneSummary: string | null;
  retailPriceCents: number | null;
  costCents: number | null;
  imageUrl: string | null;
  createdAt: string;
}

interface UsageProject {
  id: string;
  projectNumber: string;
  title: string;
  stage: string;
  clientName: string;
  targetDate: string | null;
}

interface UsageStockLot {
  id: string;
  code: string;
  description: string;
  unitCostCents: number | null;
}

interface UsageCertificate {
  id: string;
  certificateNumber: string;
  status: string;
  pieceName: string;
  clientName: string | null;
  issuedAt: string;
}

interface UsageRepair {
  id: string;
  ticketNumber: string;
  pieceDescription: string;
  status: string;
  clientName: string | null;
  createdAt: string;
}

interface Usage {
  projects: UsageProject[];
  stockLots: UsageStockLot[];
  certificates: UsageCertificate[];
  repairs: UsageRepair[];
  totalSold: number;
}

interface PieceDetail {
  piece: CatalogPiece;
  activity: { id: string; action: string; summary: string; createdAt: string; actorName: string }[];
  usage: Usage;
}

interface PieceFormData {
  sku: string;
  name: string;
  category: string;
  collection: string;
  metalType: string;
  karat: string;
  stoneSummary: string;
  retailPriceCents: string;
  costCents: string;
  imageUrl: string;
}

const emptyForm = (): PieceFormData => ({
  sku: "",
  name: "",
  category: "",
  collection: "",
  metalType: "",
  karat: "",
  stoneSummary: "",
  retailPriceCents: "",
  costCents: "",
  imageUrl: "",
});

const USE_API = import.meta.env.VITE_DATA_MODE === "api";

// ─── Component ───────────────────────────────────────────────────────────────

export function CatalogPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [records, setRecords] = useState<CatalogPiece[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PieceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PieceFormData>(emptyForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Fetch list ──────────────────────────────────────────────────────────

  const fetchList = useCallback(async () => {
    if (!USE_API) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (categoryFilter) params.set("category", categoryFilter);
      const res = await apiRequest<{ data: CatalogPiece[] }>(`/catalog?${params}`);
      setRecords(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  // ── Fetch detail ────────────────────────────────────────────────────────

  const fetchDetail = useCallback(async (id: string) => {
    if (!USE_API) return;
    setDetailLoading(true);
    try {
      const res = await apiRequest<{ data: PieceDetail }>(`/catalog/${id}`);
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

  // ── Create ──────────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm(emptyForm());
    setFormErrors({});
    setShowCreate(true);
    setShowEdit(false);
  };

  const openEdit = () => {
    if (!detail) return;
    const p = detail.piece;
    setForm({
      sku: p.sku,
      name: p.name,
      category: p.category,
      collection: p.collection ?? "",
      metalType: p.metalType ?? "",
      karat: p.karat ?? "",
      stoneSummary: p.stoneSummary ?? "",
      retailPriceCents: p.retailPriceCents != null ? String(p.retailPriceCents) : "",
      costCents: p.costCents != null ? String(p.costCents) : "",
      imageUrl: p.imageUrl ?? "",
    });
    setFormErrors({});
    setShowEdit(true);
    setShowCreate(false);
  };

  const closeForm = () => {
    setShowCreate(false);
    setShowEdit(false);
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.sku.trim()) errs.sku = "SKU is required";
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.category) errs.category = "Category is required";
    if (form.retailPriceCents && (isNaN(Number(form.retailPriceCents)) || Number(form.retailPriceCents) < 0))
      errs.retailPriceCents = "Must be a positive number";
    if (form.costCents && (isNaN(Number(form.costCents)) || Number(form.costCents) < 0))
      errs.costCents = "Must be a positive number";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        category: form.category,
      };
      if (form.collection.trim()) body.collection = form.collection.trim();
      if (form.metalType.trim()) body.metalType = form.metalType.trim();
      if (form.karat.trim()) body.karat = form.karat.trim();
      if (form.stoneSummary.trim()) body.stoneSummary = form.stoneSummary.trim();
      if (form.retailPriceCents) body.retailPriceCents = Number(form.retailPriceCents);
      if (form.costCents) body.costCents = Number(form.costCents);
      if (form.imageUrl.trim()) body.imageUrl = form.imageUrl.trim();

      const res = await apiRequest<{ data: CatalogPiece }>("/catalog", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setRecords((prev) => [res.data, ...prev]);
      closeForm();
      setSelectedId(res.data.id);
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        const mapped: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(err.fields)) {
          mapped[key] = msgs[0];
        }
        setFormErrors(mapped);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!validateForm() || !selectedId) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (form.name.trim() !== detail?.piece.name) body.name = form.name.trim();
      if (form.category !== detail?.piece.category) body.category = form.category;
      if ((form.collection.trim() || null) !== (detail?.piece.collection ?? null))
        body.collection = form.collection.trim() || null;
      if ((form.metalType.trim() || null) !== (detail?.piece.metalType ?? null))
        body.metalType = form.metalType.trim() || null;
      if ((form.karat.trim() || null) !== (detail?.piece.karat ?? null))
        body.karat = form.karat.trim() || null;
      if ((form.stoneSummary.trim() || null) !== (detail?.piece.stoneSummary ?? null))
        body.stoneSummary = form.stoneSummary.trim() || null;
      const retailVal = form.retailPriceCents ? Number(form.retailPriceCents) : null;
      if (retailVal !== (detail?.piece.retailPriceCents ?? null)) body.retailPriceCents = retailVal;
      const costVal = form.costCents ? Number(form.costCents) : null;
      if (costVal !== (detail?.piece.costCents ?? null)) body.costCents = costVal;
      if ((form.imageUrl.trim() || null) !== (detail?.piece.imageUrl ?? null))
        body.imageUrl = form.imageUrl.trim() || null;

      if (Object.keys(body).length === 0) {
        closeForm();
        return;
      }

      await apiRequest(`/catalog/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      closeForm();
      void fetchDetail(selectedId);
      void fetchList();
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        const mapped: Record<string, string> = {};
        for (const [key, msgs] of Object.entries(err.fields)) {
          mapped[key] = msgs[0];
        }
        setFormErrors(mapped);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────

  const categoryPill = (cat: string) => (
    <span
      className="inline-block px-1.5 py-px text-[10px] tracking-wide uppercase border border-border"
      style={{ color: "var(--ink-muted)" }}
    >
      {cat}
    </span>
  );

  const formField = (
    label: string,
    key: keyof PieceFormData,
    opts?: { type?: string; placeholder?: string; inputMode?: string },
  ) => (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] tracking-widest uppercase" style={{ color: "var(--accent)" }}>
        {label}
      </label>
      {key === "category" ? (
        <Combobox
          options={[...CATEGORY_FORM_OPTIONS]}
          value={form.category}
          onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
          placeholder="Select category…"
          searchPlaceholder="Search category…"
          aria-label="Category"
        />
      ) : (
        <input
          type={opts?.type ?? "text"}
          inputMode={opts?.inputMode as React.HTMLAttributes<HTMLInputElement>["inputMode"]}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          placeholder={opts?.placeholder}
          className="h-9 px-3 text-[13px] border border-border bg-transparent"
          style={{ color: "var(--foreground)" }}
        />
      )}
      {formErrors[key] && (
        <p className="text-[11px]" style={{ color: "#C73E1D" }}>
          {formErrors[key]}
        </p>
      )}
    </div>
  );

  // ── Detail pane ─────────────────────────────────────────────────────────

  const renderDetail = () => {
    if (detailLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 size={20} className="animate-spin" style={{ color: "var(--ink-muted)" }} />
        </div>
      );
    }
    if (!detail) return null;

    const { piece, usage } = detail;

    return (
      <div className="flex flex-col h-full overflow-y-auto">
        {/* ── Section 1: Header ─────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row gap-5 p-5 border-b border-border">
          <div className="flex-shrink-0 w-full md:w-48 h-48 border border-border bg-[#FAF7F0] flex items-center justify-center overflow-hidden">
            {piece.imageUrl ? (
              <img
                src={piece.imageUrl}
                alt={piece.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div className={piece.imageUrl ? "hidden" : "flex flex-col items-center gap-1"}>
              <ImageOff size={24} style={{ color: "var(--ink-muted)" }} />
              <span className="text-[10px] tracking-wide uppercase" style={{ color: "var(--ink-muted)" }}>
                No image
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="font-mono text-[13px] tracking-wider"
                style={{ color: "var(--ink-muted)" }}
              >
                {piece.sku}
              </span>
              {categoryPill(piece.category)}
            </div>
            <h2 className="font-serif text-[22px] leading-tight" style={{ color: "var(--foreground)" }}>
              {piece.name}
            </h2>
            {piece.collection && (
              <p className="text-[12px]" style={{ color: "var(--ink-muted)" }}>
                Collection: {piece.collection}
              </p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]" style={{ color: "var(--ink-muted)" }}>
              {piece.metalType && <span>{piece.metalType}{piece.karat ? ` ${piece.karat}` : ""}</span>}
              {piece.stoneSummary && <span>{piece.stoneSummary}</span>}
            </div>
            <div className="flex items-center gap-1 pt-1">
              <button
                type="button"
                onClick={openEdit}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] border border-border hover:border-accent/40 transition-colors"
              >
                <Pencil size={11} />
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* ── Section 2: Pricing ─────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-border">
          <p className="text-eyebrow tracking-widest uppercase" style={{ color: "var(--accent)" }}>
            Pricing
          </p>
          <div className="flex flex-wrap gap-x-8 gap-y-2 mt-2">
            <div>
              <p className="text-[11px] tracking-wide uppercase" style={{ color: "var(--ink-muted)" }}>
                Retail Price
              </p>
              <p className="font-mono text-[18px]" style={{ color: "var(--foreground)" }}>
                {piece.retailPriceCents != null ? php(piece.retailPriceCents / 100) : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] tracking-wide uppercase" style={{ color: "var(--ink-muted)" }}>
                Estimated Cost
              </p>
              <p className="font-mono text-[14px]" style={{ color: "var(--ink-muted)" }}>
                {piece.costCents != null ? php(piece.costCents / 100) : "—"}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--ink-muted)" }}>
                estimated / standard cost — actual COGS derives from stock
              </p>
            </div>
          </div>
        </div>

        {/* ── Section 3: Projects ────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FolderOpen size={13} style={{ color: "var(--ink-muted)" }} />
            <p className="text-eyebrow tracking-widest uppercase" style={{ color: "var(--accent)" }}>
              Projects ({usage.projects.length})
            </p>
          </div>
          {usage.projects.length === 0 ? (
            <p className="mt-2 text-[12px]" style={{ color: "var(--ink-muted)" }}>
              No projects reference this piece yet.
            </p>
          ) : (
            <div className="mt-2 space-y-1">
              {usage.projects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 border border-border text-[13px]"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: STAGE_DOT_COLORS[p.stage] ?? "var(--ink-muted)" }}
                  />
                  <span className="font-mono text-[11px] tracking-wide" style={{ color: "var(--ink-muted)" }}>
                    {p.projectNumber}
                  </span>
                  <span className="flex-1 truncate">{p.title}</span>
                  <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                    {p.clientName}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-px border border-border"
                    style={{ color: STAGE_DOT_COLORS[p.stage] ?? "var(--ink-muted)" }}
                  >
                    {STAGE_LABELS[p.stage] ?? p.stage}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Section 4: Stock ────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Package size={13} style={{ color: "var(--ink-muted)" }} />
            <p className="text-eyebrow tracking-widest uppercase" style={{ color: "var(--accent)" }}>
              Finished-Piece Stock ({usage.stockLots.length})
            </p>
          </div>
          {usage.stockLots.length === 0 ? (
            <p className="mt-2 text-[12px]" style={{ color: "var(--ink-muted)" }}>
              No finished-piece stock batches for this design.
            </p>
          ) : (
            <div className="mt-2 space-y-1">
              {usage.stockLots.map((lot) => (
                <div
                  key={lot.id}
                  className="flex items-center gap-3 px-3 py-2 border border-border text-[13px]"
                >
                  <span className="font-mono text-[11px] tracking-wide" style={{ color: "var(--ink-muted)" }}>
                    {lot.code}
                  </span>
                  <span className="flex-1 truncate">{lot.description}</span>
                  {lot.unitCostCents != null && (
                    <span className="font-mono text-[12px]" style={{ color: "var(--ink-muted)" }}>
                      {php(lot.unitCostCents / 100)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Section 5: Sold ─────────────────────────────────────────── */}
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag size={13} style={{ color: "var(--ink-muted)" }} />
            <p className="text-eyebrow tracking-widest uppercase" style={{ color: "var(--accent)" }}>
              Units Sold
            </p>
          </div>
          <p className="mt-2 font-mono text-[18px]" style={{ color: "var(--foreground)" }}>
            {usage.totalSold}
          </p>
          <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
            from stock sale movements
          </p>
        </div>

        {/* ── Section 6: Certificates ─────────────────────────────────── */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2">
            <ScrollText size={13} style={{ color: "var(--ink-muted)" }} />
            <p className="text-eyebrow tracking-widest uppercase" style={{ color: "var(--accent)" }}>
              Certificates ({usage.certificates.length})
            </p>
          </div>
          {usage.certificates.length === 0 ? (
            <p className="mt-2 text-[12px]" style={{ color: "var(--ink-muted)" }}>
              No certificates issued for this piece yet.
            </p>
          ) : (
            <div className="mt-2 space-y-1">
              {usage.certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="flex items-center gap-3 px-3 py-2 border border-border text-[13px]"
                >
                  <span className="font-mono text-[11px] tracking-wide" style={{ color: "var(--ink-muted)" }}>
                    {cert.certificateNumber}
                  </span>
                  <span className="flex-1 truncate">{cert.pieceName}</span>
                  {cert.clientName && (
                    <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                      {cert.clientName}
                    </span>
                  )}
                  <span
                    className="text-[10px] px-1.5 py-px border border-border"
                    style={{ color: CERT_STATUS_COLORS[cert.status] ?? "var(--ink-muted)" }}
                  >
                    {cert.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Section 7: Repairs ──────────────────────────────────────── */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2">
            <Wrench size={13} style={{ color: "var(--ink-muted)" }} />
            <p className="text-eyebrow tracking-widest uppercase" style={{ color: "var(--accent)" }}>
              Repairs ({usage.repairs.length})
            </p>
          </div>
          {usage.repairs.length === 0 ? (
            <p className="mt-2 text-[12px]" style={{ color: "var(--ink-muted)" }}>
              No repairs linked to this piece yet.
            </p>
          ) : (
            <div className="mt-2 space-y-1">
              {usage.repairs.map((repair) => (
                <div
                  key={repair.id}
                  className="flex items-center gap-3 px-3 py-2 border border-border text-[13px]"
                >
                  <span className="font-mono text-[11px] tracking-wide" style={{ color: "var(--ink-muted)" }}>
                    {repair.ticketNumber}
                  </span>
                  <span className="flex-1 truncate">{repair.pieceDescription}</span>
                  {repair.clientName && (
                    <span className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                      {repair.clientName}
                    </span>
                  )}
                  <span
                    className="text-[10px] px-1.5 py-px border border-border"
                    style={{ color: "var(--ink-muted)" }}
                  >
                    {repair.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Form overlay ────────────────────────────────────────────────────────

  const isFormOpen = showCreate || showEdit;

  const renderForm = () => {
    if (!isFormOpen) return null;

    const footer = (
      <>
        <button
          type="button"
          onClick={closeForm}
          className="px-3 py-1.5 text-[12px] border border-border hover:bg-surface transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={showCreate ? handleCreate : handleUpdate}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12px] text-white transition-colors"
          style={{ background: saving ? "#7A6F5E" : "#17140F" }}
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          {showCreate ? "Create Piece" : "Save Changes"}
        </button>
      </>
    );

    return (
      <Modal
        open={isFormOpen}
        onClose={closeForm}
        title={showCreate ? "New Piece" : "Edit Piece"}
        width={520}
        footer={footer}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {formField("SKU *", "sku", { placeholder: "e.g. TR-001" })}
            {formField("Name *", "name", { placeholder: "e.g. Twisted Pearl Ring" })}
            {formField("Category *", "category")}
            {formField("Collection", "collection", { placeholder: "e.g. Spring 2026" })}
            {formField("Metal Type", "metalType", { placeholder: "e.g. Sterling Silver" })}
            {formField("Karat", "karat", { placeholder: "e.g. 18K" })}
          </div>

          {formField("Stone Summary", "stoneSummary", {
            placeholder: "e.g. Freshwater pearl, 8mm",
          })}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {formField("Retail Price (centavos)", "retailPriceCents", {
              type: "number",
              inputMode: "numeric",
              placeholder: "e.g. 250000 for ₱2,500",
            })}
            {formField("Estimated Cost (centavos)", "costCents", {
              type: "number",
              inputMode: "numeric",
              placeholder: "e.g. 80000 for ₱800",
            })}
          </div>

          {formField("Image URL", "imageUrl", {
            placeholder: "https://…",
          })}
        </div>
      </Modal>
    );
  };

  // ── Card grid (sidebar) ─────────────────────────────────────────────────

  const renderCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
      {records.map((piece) => {
        const isSelected = selectedId === piece.id;
        return (
          <button
            key={piece.id}
            type="button"
            onClick={() => handleSelect(piece.id)}
            className="text-left border border-border hover:border-accent/40 transition-colors overflow-hidden group"
            style={{
              background: isSelected ? "var(--surface)" : "var(--canvas)",
              outline: isSelected ? "1px solid var(--accent)" : "none",
              outlineOffset: "-1px",
            }}
          >
            {/* Image */}
            <div className="aspect-square bg-[#FAF7F0] flex items-center justify-center overflow-hidden border-b border-border">
              {piece.imageUrl ? (
                <img
                  src={piece.imageUrl}
                  alt={piece.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                  }}
                />
              ) : null}
              <div className={piece.imageUrl ? "hidden" : "flex flex-col items-center gap-1"}>
                <ImageOff size={20} style={{ color: "var(--ink-muted)" }} />
                <span className="text-[11px] tracking-wide uppercase" style={{ color: "var(--ink-muted)" }}>
                  No image
                </span>
              </div>
            </div>
            {/* Info */}
            <div className="p-2.5 space-y-1">
              <p className="font-mono text-[10px] tracking-wider" style={{ color: "var(--ink-muted)" }}>
                {piece.sku}
              </p>
              <p
                className="font-serif text-[13px] leading-snug truncate"
                style={{ color: "var(--foreground)" }}
              >
                {piece.name}
              </p>
              <div className="flex items-center justify-between gap-2">
                {categoryPill(piece.category)}
                {piece.retailPriceCents != null && (
                  <span className="font-mono text-[11px] flex-shrink-0" style={{ color: "var(--foreground)" }}>
                    {php(piece.retailPriceCents / 100)}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <>
      <MasterDetail
        hasSelection={!!selectedId}
        loading={loading}
        error={error}
        isEmpty={!loading && !error && records.length === 0}
        emptyState={
          <div className="p-6 text-center text-[13px]" style={{ color: "var(--ink-muted)" }}>
            No designs yet. Create your first piece.
          </div>
        }
        header={
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-2">
            <div>
              <p className="text-eyebrow tracking-widest uppercase" style={{ color: "var(--accent)" }}>
                Design Library
              </p>
              <h2 className="font-serif text-body-lg mt-0.5">Catalog</h2>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 min-h-9 px-3 border border-border bg-card text-[12px] hover:border-accent/40 transition-colors"
            >
              <Plus size={13} />
              New Piece
            </button>
          </div>
        }
        toolbar={
          <>
            <div className="relative flex-1 min-w-[180px] max-w-[320px]">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "var(--ink-muted)" }}
              />
              <input
                type="search"
                placeholder="Search by SKU or name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-8 pr-3 text-[13px] border border-border bg-transparent"
                style={{ color: "var(--foreground)" }}
              />
            </div>
            <Combobox
              options={[...CATEGORY_OPTIONS]}
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              placeholder="Filter category…"
              searchPlaceholder="Search category…"
              aria-label="Filter by category"
            />
          </>
        }
        sidebar={renderCards()}
        detail={renderDetail()}
        noSelectionPlaceholder={
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center p-6">
            <ImageOff size={28} style={{ color: "var(--ink-muted)" }} />
            <p className="text-[13px]" style={{ color: "var(--ink-muted)" }}>
              Select a piece to view its details
            </p>
          </div>
        }
        onBack={() => setSelectedId(null)}
      />

      {renderForm()}
    </>
  );
}
