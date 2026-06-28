import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Archive, Download, Edit3, FolderOpen, Plus, ReceiptText, Search } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { apiRequest, ApiError } from "../api";
import {
  ACTIVE_STAGES,
  EMPTY_PROJECT_FORM,
  fixtureProjectToRecord,
  projectToForm,
  STAGE_DOT_COLOR,
  STAGE_LABELS,
  STAGE_ORDER,
  STAGE_PILL_STYLE,
  type ProjectActivity,
  type ProjectFormValues,
  type ProjectRecord,
  type ProjectStage,
} from "../projects";
import { INITIAL_CLIENTS, INITIAL_PROJECTS, fmtDate, php } from "../data";
import { Btn, ConfirmDialog, Field, FormRow, Input, Modal, Textarea } from "./Modal";
import { Combobox } from "./ui/combobox";
import { PiecePicker } from "./ui/piece-picker";
import { useToast } from "./Toast";
import { exportCsv, exportJson, timestamp } from "../exports";
import { useDraft } from "../useDraft";
import { useOutbox } from "../useOutbox";
import type { Draft } from "../db";

interface ProjectListResponse {
  data: Array<Omit<ProjectRecord, "source">>;
  pagination: { total: number };
}

interface ProjectDetailResponse {
  data: {
    project: Omit<ProjectRecord, "source">;
    activity: ProjectActivity[];
    finance?: { agreedPriceCents: number; invoicedCents: number; paidCents: number };
  };
}

interface ProjectMutationResponse {
  data: Omit<ProjectRecord, "source">;
}

const USE_DATABASE = import.meta.env.VITE_DATA_MODE === "api";

function asDatabaseProject(p: Omit<ProjectRecord, "source">): ProjectRecord {
  return { ...p, source: "database" };
}

function ProjectForm({
  initial,
  saving,
  clients,
  events,
  onCancel,
  onSave,
  drafts,
  onSaveDraft,
  onLoadDraft,
  onDiscardDraft,
  isNew,
}: {
  initial: ProjectFormValues;
  saving: boolean;
  clients: Array<{ id: string; name: string }>;
  events: Array<{ id: string; name: string }>;
  onCancel: () => void;
  onSave: (values: ProjectFormValues) => Promise<void>;
  drafts: Draft[];
  onSaveDraft: (values: ProjectFormValues) => Promise<void>;
  onLoadDraft: (draft: Draft) => ProjectFormValues;
  onDiscardDraft: (id: string) => Promise<void>;
  isNew: boolean;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof ProjectFormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!values.title.trim()) { setError("Project title is required."); return; }
    if (!values.clientId) { setError("Client is required."); return; }
    try {
      await onSave(values);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The project could not be saved.");
    }
  }

  return (
    <form id="project-form" onSubmit={submit} className="space-y-4">
      {drafts.length > 0 && (
        <div className="border border-accent/30 bg-accent/5 p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Saved on this device</p>
          {drafts.slice(0, 3).map((draft) => (
            <div key={draft.id} className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
              <button type="button" onClick={() => setValues(onLoadDraft(draft))} className="min-h-9 min-w-0 flex-1 text-left text-[12px] text-foreground">
                {(draft.values.title as string) || "Untitled project"} <span className="text-[11px] text-muted-foreground">· {new Date(draft.updatedAt).toLocaleString("en-PH")}</span>
              </button>
              <button type="button" onClick={() => void onDiscardDraft(draft.id)} className="min-h-9 px-2 text-[11px] uppercase tracking-wider text-muted-foreground">Discard</button>
            </div>
          ))}
        </div>
      )}
      {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">{error}</p>}
      <FormRow>
        <Field label="Project number" required={false}>
          <Input aria-label="Project number" value={values.projectNumber} onChange={(e) => set("projectNumber", e.target.value)} placeholder={isNew ? "Auto-generated · PRJ-XXXX" : "SS-001"} maxLength={40} autoFocus />
        </Field>
        {!isNew && (
          <Field label="Stage">
            <Combobox
              aria-label="Stage"
              value={values.stage}
              onValueChange={(v) => set("stage", v as ProjectStage)}
              options={STAGE_ORDER.map((s) => ({ value: s, label: STAGE_LABELS[s] }))}
              placeholder="Select stage"
              searchPlaceholder="Search stages..."
            />
          </Field>
        )}
        {isNew && (
          <Field label="Stage">
            <div className="min-h-10 flex items-center border border-border bg-muted/20 px-3">
              <p className="text-[12px] text-muted-foreground">Inquiry (default for new projects)</p>
            </div>
          </Field>
        )}
      </FormRow>
      <Field label="Title" required>
        <Input aria-label="Title" value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="Custom pearl necklace" maxLength={200} />
      </Field>
      <Field label="Client" required>
        <Combobox
          aria-label="Client"
          value={values.clientId}
          onValueChange={(v) => set("clientId", v)}
          options={clients.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="Select a client"
          searchPlaceholder="Search clients..."
        />
      </Field>
      <Field label="Catalog piece (design reference)">
        <PiecePicker
          value={values.catalogPieceId}
          onValueChange={(id) => set("catalogPieceId", id)}
          placeholder="Search catalog piece…"
        />
      </Field>
      <Field label="Event">
        <Combobox
          aria-label="Event"
          value={values.eventId}
          onValueChange={(v) => set("eventId", v)}
          options={events.map((e) => ({ value: e.id, label: e.name }))}
          placeholder="Link to an event (optional)"
          searchPlaceholder="Search events..."
        />
      </Field>
      <Field label="Target date">
        <Input aria-label="Target date" type="date" value={values.targetDate} onChange={(e) => set("targetDate", e.target.value)} />
      </Field>
      <Field label="Brief">
        <Textarea aria-label="Brief" value={values.brief} onChange={(e) => set("brief", e.target.value)} placeholder="Design details, materials, client preferences..." maxLength={5000} />
      </Field>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Btn variant="ghost" onClick={() => void onSaveDraft(values)} disabled={saving}>Save draft</Btn>
        <Btn variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Btn>
        <Btn type="submit" disabled={saving}>{saving ? "Saving..." : "Save project"}</Btn>
      </div>
    </form>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { toast } = useToast();
  const [records, setRecords] = useState<ProjectRecord[]>(() => INITIAL_PROJECTS.map(fixtureProjectToRecord));
  const [activity, setActivity] = useState<ProjectActivity[]>([]);
  const [finance, setFinance] = useState<{ agreedPriceCents: number; invoicedCents: number; paidCents: number } | null>(null);
  const [linkedCerts, setLinkedCerts] = useState<Array<{ id: string; certificateNumber: string; pieceName: string; status: string }>>([]);
  const [linkedRepairs, setLinkedRepairs] = useState<Array<{ id: string; ticketNumber: string; pieceDescription: string; status: string }>>([]);
  const [clientList, setClientList] = useState<Array<{ id: string; name: string }>>(() =>
    INITIAL_CLIENTS.map((c) => ({ id: c.id, name: c.name })),
  );
  const [eventList, setEventList] = useState<Array<{ id: string; name: string }>>([]);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<ProjectStage | "all">("all");
  const [loading, setLoading] = useState(USE_DATABASE);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<"new" | "edit" | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [billType, setBillType] = useState<"deposit" | "balance">("deposit");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [billNotes, setBillNotes] = useState("");
  const [billing, setBilling] = useState(false);
  const projectDrafts = useDraft<ProjectFormValues>("project");
  const outbox = useOutbox();

  async function loadProjects() {
    if (!USE_DATABASE) return;
    setLoading(true);
    setError(null);
    try {
      const [projectRes, clientRes, eventRes] = await Promise.all([
        apiRequest<ProjectListResponse>("/projects?limit=100"),
        apiRequest<{ data: Array<{ id: string; name: string }> }>("/clients?limit=100"),
        apiRequest<{ data: Array<{ id: string; name: string; instagramHandle: string | null }> }>("/events?limit=100"),
      ]);
      setRecords(projectRes.data.map(asDatabaseProject));
      setClientList(clientRes.data.map((c) => ({ id: c.id, name: c.name })));
      setEventList(eventRes.data.map((e) => ({ id: e.id, name: e.name })));
    } catch (caught) {
      const message = caught instanceof ApiError && caught.status === 401
        ? "Sign in is required before the shared project workspace can load."
        : caught instanceof Error ? caught.message : "Projects could not be loaded.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  const visible = useMemo(() => {
    let filtered = records;
    if (stageFilter !== "all") {
      filtered = filtered.filter((r) => r.stage === stageFilter);
    }
    const needle = query.trim().toLowerCase();
    if (needle) {
      filtered = filtered.filter((r) =>
        [r.title, r.projectNumber, r.clientName, r.eventName, r.brief]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(needle)),
      );
    }
    return filtered;
  }, [query, stageFilter, records]);

  const selected = records.find((r) => r.id === projectId) ?? (projectId ? undefined : records[0]);

  useEffect(() => {
    if (!selected) { setActivity([]); setFinance(null); return; }
    if (!USE_DATABASE) {
      setActivity([{
        id: `fixture-${selected.id}`,
        action: "project.sample_loaded",
        summary: "Loaded from the Phase 0 sample workspace",
        actorName: "Seine Studio",
        createdAt: selected.createdAt,
      }]);
      return;
    }
    let active = true;
    apiRequest<ProjectDetailResponse>(`/projects/${selected.id}`)
      .then((res) => {
        if (active) {
          setActivity(res.data.activity);
          if (res.data.finance) setFinance(res.data.finance);
        }
      })
      .catch(() => { if (active) setActivity([]); });
    // Fetch linked certificates
    apiRequest<{ data: Array<{ id: string; certificateNumber: string; pieceName: string; status: string }> }>(
      `/certificates?projectId=${selected.id}&limit=20`,
    )
      .then((res) => { if (active) setLinkedCerts(res.data); })
      .catch(() => {});
    // Fetch linked repairs
    apiRequest<{ data: Array<{ id: string; ticketNumber: string; pieceDescription: string; status: string }> }>(
      `/repairs?projectId=${selected.id}&limit=20`,
    )
      .then((res) => { if (active) setLinkedRepairs(res.data); })
      .catch(() => {});
    return () => { active = false; };
  }, [selected?.id]);

  async function saveProject(values: ProjectFormValues) {
    setSaving(true);
    try {
      if (editor === "new") {
        if (USE_DATABASE) {
          if (!navigator.onLine) {
            await projectDrafts.save(values);
            toast.info("Draft saved", "This new project remains on this device until you reconnect and submit it.");
            setEditor(null);
            return;
          }
          const targetDate = values.targetDate ? new Date(values.targetDate).toISOString() : undefined;
          const body: Record<string, unknown> = {
            clientId: values.clientId,
            title: values.title,
            stage: "inquiry",
          };
          if (values.projectNumber) body.projectNumber = values.projectNumber;
          if (targetDate) body.targetDate = targetDate;
          if (values.brief) body.brief = values.brief;
          if (values.eventId) body.eventId = values.eventId;
          if (values.catalogPieceId) body.catalogPieceId = values.catalogPieceId;
          const res = await apiRequest<ProjectMutationResponse>("/projects", {
            method: "POST",
            body: JSON.stringify(body),
          });
          const created = asDatabaseProject(res.data);
          setRecords((curr) => [...curr, created]);
          navigate(`/projects/${created.id}`);
          if (projectDrafts.activeDraftId) await projectDrafts.discard(projectDrafts.activeDraftId);
        } else {
          const now = new Date().toISOString();
          const created: ProjectRecord = {
            id: `sample-${crypto.randomUUID()}`,
            projectNumber: values.projectNumber,
            clientId: values.clientId,
            clientName: clientList.find((c) => c.id === values.clientId)?.name,
            eventId: values.eventId || null,
            eventName: eventList.find((e) => e.id === values.eventId)?.name ?? null,
            title: values.title,
            stage: values.stage,
            targetDate: values.targetDate || null,
            brief: values.brief || null,
            createdAt: now,
            updatedAt: now,
            source: "fixture",
          };
          setRecords((curr) => [...curr, created]);
          navigate(`/projects/${created.id}`);
        }
        toast.success("Project created", `${values.title} has been added.`);
      } else if (selected) {
        if (USE_DATABASE) {
          const targetDate = values.targetDate ? new Date(values.targetDate).toISOString() : "";
          if (!navigator.onLine) {
            await outbox.add("PATCH", `/projects/${selected.id}`, {
              title: values.title,
              clientId: values.clientId || undefined,
              eventId: values.eventId || undefined,
              stage: values.stage,
              targetDate: targetDate || undefined,
              brief: values.brief || undefined,
              expectedUpdatedAt: selected.updatedAt,
            });
            setRecords((curr) => curr.map((record) => record.id === selected.id
              ? {
                  ...record,
                  ...values,
                  clientName: clientList.find((client) => client.id === values.clientId)?.name,
                  eventName: eventList.find((e) => e.id === values.eventId)?.name ?? null,
                  targetDate: values.targetDate || null,
                  brief: values.brief || null,
                  updatedAt: new Date().toISOString(),
                }
              : record));
            toast.warning("Change queued", "Use Sync now after reconnecting. The server has not confirmed this edit yet.");
            setEditor(null);
            return;
          }
          // Only send fields that are valid for updateProjectInput
          const patchBody: Record<string, unknown> = {
            title: values.title,
            clientId: values.clientId || undefined,
            eventId: values.eventId || undefined,
            stage: values.stage,
            targetDate: targetDate || undefined,
            brief: values.brief || undefined,
            expectedUpdatedAt: selected.updatedAt,
          };
          // Strip undefined keys
          Object.keys(patchBody).forEach((k) => { if (patchBody[k] === undefined) delete patchBody[k]; });

          const res = await apiRequest<ProjectMutationResponse>(`/projects/${selected.id}`, {
            method: "PATCH",
            body: JSON.stringify(patchBody),
          });
          const updated = asDatabaseProject(res.data);
          setRecords((curr) => curr.map((r) => (r.id === updated.id ? updated : r)));
        } else {
          setRecords((curr) => curr.map((r) => r.id === selected.id
            ? { ...r, ...values, clientName: clientList.find((c) => c.id === values.clientId)?.name, eventName: eventList.find((e) => e.id === values.eventId)?.name ?? null, targetDate: values.targetDate || null, brief: values.brief || null, updatedAt: new Date().toISOString() }
            : r));
        }
        toast.success("Project updated", `${values.title} was saved.`);
      }
      setEditor(null);
    } finally {
      setSaving(false);
    }
  }

  async function billProject() {
    if (!selected || !billAmount || !finance) return;
    setBilling(true);
    try {
      const amountCents = Math.round(parseFloat(billAmount) * 100);
      const dueDate = billDueDate ? new Date(billDueDate).toISOString() : undefined;

      await apiRequest("/api/invoices", {
        method: "POST",
        body: JSON.stringify({
          clientId: selected.clientId,
          projectId: selected.id,
          subtotalCents: amountCents,
          discountCents: 0,
          taxCents: 0,
          totalCents: amountCents,
          depositPercent: billType === "deposit" ? 100 : undefined,
          dueDate,
          notes: billNotes || `${billType === "deposit" ? "Deposit" : "Balance"} invoice for ${selected.title}`,
        }),
      });

      setBillOpen(false);
      setBillAmount("");
      setBillDueDate("");
      setBillNotes("");
      // Refresh to show updated financials
      if (selected) {
        apiRequest<ProjectDetailResponse>(`/projects/${selected.id}`)
          .then((res) => { if (res.data.finance) setFinance(res.data.finance); })
          .catch(() => {});
      }
      toast.success("Invoice created", `${billType === "deposit" ? "Deposit" : "Balance"} invoice billed for ${selected.title}.`);
    } catch (err) {
      toast.error("Billing failed", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBilling(false);
    }
  }

  const openBillModal = (type: "deposit" | "balance") => {
    if (!finance || !selected) return;
    setBillType(type);
    const quoteTotal = finance.agreedPriceCents / 100;
    const alreadyInvoiced = finance.invoicedCents / 100;
    if (type === "deposit") {
      // Default to 50% of agreed price
      setBillAmount((quoteTotal * 0.5).toFixed(2));
    } else {
      // Balance = agreed total - already invoiced
      setBillAmount(Math.max(0, quoteTotal - alreadyInvoiced).toFixed(2));
    }
    setBillDueDate("");
    setBillNotes("");
    setBillOpen(true);
  };

  async function archiveProject() {
    if (!selected) return;
    if (USE_DATABASE && !navigator.onLine) {
      toast.warning("Connection required", "Archiving cannot be queued because it changes the durable project record.");
      return;
    }
    try {
      if (USE_DATABASE) await apiRequest(`/projects/${selected.id}`, { method: "DELETE" });
      setRecords((curr) => curr.filter((r) => r.id !== selected.id));
      navigate("/projects");
      toast.success("Project archived", `${selected.title} was removed from active projects.`);
    } catch (caught) {
      toast.error("Archive failed", caught instanceof Error ? caught.message : "Please try again.");
    }
  }

  const stageCounts = useMemo(() => {
    const counts = new Map<ProjectStage, number>();
    for (const r of records) counts.set(r.stage, (counts.get(r.stage) ?? 0) + 1);
    return counts;
  }, [records]);

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-accent">Custom creations</p>
          <h2 className="mt-1 font-serif text-2xl text-foreground">Each commission, fully traced.</h2>
          <p className="mt-1 max-w-xl text-[12px] leading-5 text-muted-foreground">
            Track every custom project from inquiry through delivery with client, brief, stage, and deadline.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => {
            const cols = [
              { key: "projectNumber" as const, label: "Number" },
              { key: "title" as const, label: "Title" },
              { key: "clientName" as const, label: "Client" },
              { key: "eventName" as const, label: "Event" },
              { key: "stage" as const, label: "Stage" },
              { key: "targetDate" as const, label: "Target Date" },
              { key: "brief" as const, label: "Brief" },
              { key: "createdAt" as const, label: "Created" },
            ];
            exportCsv(records, cols, `seine-projects-${timestamp()}.csv`);
          }} className="inline-flex min-h-11 items-center gap-2 border border-border px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Download size={13} /> CSV
          </button>
          <button type="button" onClick={() => exportJson(records, `seine-projects-${timestamp()}.json`)} className="inline-flex min-h-11 items-center gap-2 border border-border px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Download size={13} /> JSON
          </button>
          <button type="button" onClick={() => setEditor("new")} className="inline-flex min-h-11 items-center justify-center gap-2 bg-foreground px-4 text-[12px] uppercase tracking-[0.16em] text-background">
            <Plus size={13} /> New project
          </button>
        </div>
      </div>

      <div className={`border px-4 py-3 text-[12px] ${USE_DATABASE ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-accent/30 bg-accent/5 text-muted-foreground"}`}>
        {USE_DATABASE ? "Shared Neon workspace · changes are saved for both authorized users." : "Sample workspace · changes last only until this page is refreshed."}
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 border border-red-200 bg-red-50 p-4 text-[12px] text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => void loadProjects()} className="min-h-11 px-3 uppercase tracking-wider">Retry</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => setStageFilter("all")} className={`min-h-9 border px-3 text-[11px] uppercase tracking-[0.15em] transition-all ${stageFilter === "all" ? "border-foreground bg-foreground text-card" : "border-border bg-card text-muted-foreground"}`}>
          All ({records.length})
        </button>
        {ACTIVE_STAGES.map((s) => (
          <button key={s} type="button" onClick={() => setStageFilter(s)} className={`min-h-9 border px-3 text-[11px] uppercase tracking-[0.15em] transition-all ${stageFilter === s ? "border-foreground bg-foreground text-card" : "border-border bg-card text-muted-foreground"}`}>
            {STAGE_LABELS[s]} ({stageCounts.get(s) ?? 0})
          </button>
        ))}
      </div>

      <div className="grid min-h-[560px] border border-border bg-card lg:grid-cols-[300px_1fr]">
        <aside className={`border-b border-border p-4 lg:block lg:border-b-0 lg:border-r ${projectId ? "hidden" : "block"}`}>
          <label className="flex min-h-11 items-center gap-2 border border-border bg-background px-3">
            <Search size={13} className="text-muted-foreground" />
            <span className="sr-only">Search projects</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, number, or client" className="w-full bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground" />
          </label>
          <p className="px-1 pb-3 pt-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {loading ? "Loading projects" : `${visible.length} project${visible.length === 1 ? "" : "s"}`}
          </p>
          <div className="max-h-[440px] space-y-1 overflow-auto">
            {visible.map((project) => (
              <button key={project.id} type="button" onClick={() => navigate(`/projects/${project.id}`)} className={`flex min-h-14 w-full items-center gap-3 border px-3 text-left transition-colors ${selected?.id === project.id ? "border-accent/40 bg-accent/5" : "border-transparent hover:border-border"}`}>
                <span className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${STAGE_DOT_COLOR[project.stage]}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium text-foreground">{project.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{project.projectNumber} · {project.clientName || "—"}</span>
                </span>
              </button>
            ))}
            {!loading && visible.length === 0 && <p className="border border-dashed border-border p-6 text-center text-[12px] text-muted-foreground">No projects match this search.</p>}
          </div>
        </aside>

        <section className={`min-w-0 lg:block ${projectId ? "block" : "hidden"}`}>
          {!selected ? (
            <div className="flex h-full min-h-80 flex-col items-center justify-center p-8 text-center">
              <FolderOpen size={24} className="text-accent" />
              <p className="mt-3 font-serif text-lg text-foreground">No project selected</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Create a custom project to begin tracking commissions.</p>
            </div>
          ) : (
            <>
              <header className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
                <button type="button" onClick={() => navigate("/projects")} className="min-h-11 self-start text-[11px] uppercase tracking-[0.16em] text-muted-foreground lg:hidden">← All projects</button>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${STAGE_DOT_COLOR[selected.stage]}`} />
                    <span className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium ${STAGE_PILL_STYLE[selected.stage]}`}>
                      {STAGE_LABELS[selected.stage]}
                    </span>
                  </div>
                  <h3 className="mt-2 font-serif text-xl text-foreground">{selected.title}</h3>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {selected.projectNumber} · {selected.clientName || "—"}{selected.targetDate ? ` · Due ${fmtDate(typeof selected.targetDate === "string" ? selected.targetDate : "")}` : ""}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {USE_DATABASE && finance && finance.agreedPriceCents > 0 && (
                    <>
                      <button type="button" onClick={() => openBillModal("deposit")} className="inline-flex min-h-11 items-center gap-2 border border-accent/40 bg-accent text-white px-3 text-[11px] uppercase tracking-wider">
                        <ReceiptText size={12} /> Bill deposit
                      </button>
                      <button type="button" onClick={() => openBillModal("balance")} className="inline-flex min-h-11 items-center gap-2 border border-border px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                        <ReceiptText size={12} /> Bill balance
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => setEditor("edit")} className="inline-flex min-h-11 items-center gap-2 border border-border px-3 text-[11px] uppercase tracking-wider text-muted-foreground"><Edit3 size={12} /> Edit</button>
                  <button type="button" onClick={() => setArchiveOpen(true)} className="inline-flex min-h-11 items-center gap-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground"><Archive size={12} /> Archive</button>
                </div>
              </header>

              <div className="grid sm:grid-cols-2">
                <div className="space-y-5 border-b border-border p-5 sm:border-b-0 sm:border-r">
                  <Detail label="Project number" value={selected.projectNumber} />
                  <Detail label="Client" value={selected.clientName || null} />
                  <Detail label="Event" value={selected.eventName || null} />
                  <Detail label="Stage" value={STAGE_LABELS[selected.stage]} />
                  <Detail label="Target date" value={selected.targetDate ? fmtDate(typeof selected.targetDate === "string" ? selected.targetDate : "") : null} />
                  <Detail label="Brief" value={selected.brief} multiline />
                </div>
                <div className="space-y-6 p-5">
                  {finance && (
                    <div>
                      <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Financial Summary</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="border border-border p-2">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Agreed Price</p>
                          <p className="mt-0.5 font-mono text-[13px] text-foreground">{php(finance.agreedPriceCents / 100)}</p>
                        </div>
                        <div className="border border-border p-2">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Invoiced</p>
                          <p className="mt-0.5 font-mono text-[13px] text-foreground">{php(finance.invoicedCents / 100)}</p>
                        </div>
                        <div className="border border-border p-2">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Paid</p>
                          <p className="mt-0.5 font-mono text-[13px] text-emerald-800">{php(finance.paidCents / 100)}</p>
                        </div>
                        <div className="border border-border p-2">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</p>
                          <p className={`mt-0.5 font-mono text-[13px] ${finance.invoicedCents - finance.paidCents > 0 ? "text-amber-700" : "text-muted-foreground"}`}>{php((finance.invoicedCents - finance.paidCents) / 100)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Activity</p>
                    <div className="space-y-3 border-l border-border pl-4">
                      {[...activity].reverse().map((event) => (
                        <div key={event.id}>
                          <p className="text-[12px] text-foreground">{event.summary}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{event.actorName} · {fmtDate(event.createdAt)}</p>
                        </div>
                      ))}
                      {!activity.length && <p className="text-[12px] text-muted-foreground">No activity recorded yet.</p>}
                    </div>
                  </div>
                  {USE_DATABASE && (
                    <>
                      {linkedCerts.length > 0 && (
                        <div>
                          <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Certificates ({linkedCerts.length})</p>
                          <div className="space-y-1.5">
                            {linkedCerts.slice(0, 5).map((c) => (
                              <div key={c.id} className="border border-border p-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-[11px] font-medium">{c.pieceName}</p>
                                  <span className="text-[10px] px-1.5 py-0.5 uppercase" style={{ color: "var(--ink-muted)", background: "var(--surface)" }}>{c.status}</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{c.certificateNumber}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {linkedRepairs.length > 0 && (
                        <div>
                          <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Repairs ({linkedRepairs.length})</p>
                          <div className="space-y-1.5">
                            {linkedRepairs.slice(0, 5).map((r) => (
                              <div key={r.id} className="border border-border p-2">
                                <div className="flex items-center justify-between">
                                  <p className="text-[11px] font-medium truncate">{r.pieceDescription}</p>
                                  <span className="text-[10px] px-1.5 py-0.5 uppercase" style={{ color: "var(--ink-muted)", background: "var(--surface)" }}>{r.status}</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{r.ticketNumber}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <Modal open={editor !== null} onClose={() => setEditor(null)} title={editor === "new" ? "New project" : "Edit project"} subtitle="Track a custom creation from inquiry through delivery." width={560}>
        <ProjectForm
          initial={editor === "edit" && selected ? projectToForm(selected) : EMPTY_PROJECT_FORM}
          saving={saving}
          clients={clientList}
          events={eventList}
          isNew={editor === "new"}
          onCancel={() => setEditor(null)}
          onSave={saveProject}
          drafts={projectDrafts.drafts}
          onSaveDraft={async (values) => {
            await projectDrafts.save(values);
            toast.success("Draft saved", "This project draft is stored only on this device.");
          }}
          onLoadDraft={projectDrafts.load}
          onDiscardDraft={projectDrafts.discard}
        />
      </Modal>

      <ConfirmDialog open={archiveOpen} onClose={() => setArchiveOpen(false)} onConfirm={() => void archiveProject()} title="Archive project" message={`Archive ${selected?.title ?? "this project"}? Its history remains preserved.`} confirmLabel="Archive" danger />

      {/* ── Bill project modal ────────────────────────────────────────── */}
      {billOpen && (
        <Modal
          open={billOpen}
          onClose={() => setBillOpen(false)}
          title={billType === "deposit" ? "Bill deposit" : "Bill balance"}
          subtitle={`Create an invoice for ${selected?.title}`}
          width={480}
          footer={
            <>
              <button
                type="button"
                onClick={() => setBillOpen(false)}
                className="min-h-9 px-4 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={billProject}
                disabled={!billAmount || billing}
                className="min-h-9 px-4 border border-accent/40 bg-accent text-white text-[12px] disabled:opacity-40 transition-opacity"
              >
                {billing ? "Creating…" : `Create ${billType === "deposit" ? "deposit" : "balance"} invoice`}
              </button>
            </>
          }
        >
          <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => openBillModal("deposit")}
                  className={`min-h-10 border text-[12px] ${billType === "deposit" ? "border-foreground bg-foreground text-card" : "border-border text-muted-foreground"}`}
                >
                  Deposit
                </button>
                <button
                  type="button"
                  onClick={() => openBillModal("balance")}
                  className={`min-h-10 border text-[12px] ${billType === "balance" ? "border-foreground bg-foreground text-card" : "border-border text-muted-foreground"}`}
                >
                  Balance
                </button>
              </div>

              {finance && (
                <div className="border border-border bg-muted/20 p-3 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Agreed price</span>
                    <span className="font-mono">{php(finance.agreedPriceCents / 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Already invoiced</span>
                    <span className="font-mono">{php(finance.invoicedCents / 100)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1">
                    <span className="font-medium">Remaining</span>
                    <span className="font-mono font-medium">{php(Math.max(0, finance.agreedPriceCents - finance.invoicedCents) / 100)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Amount (₱)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {billType === "deposit" ? "Suggested: 50% of agreed price as deposit." : "Remaining balance after prior invoices."}
                </p>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Due date</label>
                <input
                  type="date"
                  value={billDueDate}
                  onChange={(e) => setBillDueDate(e.target.value)}
                  className="w-full min-h-10 border border-border bg-card px-3 text-[13px] outline-none focus:border-accent/40"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Notes</label>
                <textarea
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-border bg-card px-3 py-2 text-[13px] outline-none focus:border-accent/40 resize-none"
                  placeholder={billType === "deposit" ? "Deposit invoice for " + (selected?.title || "project") : "Final balance invoice"}
                />
              </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Detail({ label, value, multiline = false }: { label: string; value: string | null; multiline?: boolean }) {
  return (
    <div>
      <p className="mb-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={`text-[11px] text-foreground ${multiline ? "whitespace-pre-wrap leading-5" : ""}`}>{value || "Not added"}</p>
    </div>
  );
}
