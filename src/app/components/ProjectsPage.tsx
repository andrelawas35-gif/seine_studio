import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Archive, Download, Edit3, FolderOpen, Plus, Search } from "lucide-react";
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
import { INITIAL_CLIENTS, INITIAL_PROJECTS, fmtDate } from "../data";
import { Btn, ConfirmDialog, Field, FormRow, Input, Modal, Textarea } from "./Modal";
import { Combobox } from "./ui/combobox";
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
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof ProjectFormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!values.title.trim()) { setError("Project title is required."); return; }
    if (!values.projectNumber.trim()) { setError("Project number is required."); return; }
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
        <Field label="Project number" required>
          <Input aria-label="Project number" value={values.projectNumber} onChange={(e) => set("projectNumber", e.target.value)} placeholder="SS-001" maxLength={40} autoFocus />
        </Field>
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
    if (!selected) { setActivity([]); return; }
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
      .then((res) => { if (active) setActivity(res.data.activity); })
      .catch(() => { if (active) setActivity([]); });
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
          const res = await apiRequest<ProjectMutationResponse>("/projects", {
            method: "POST",
            body: JSON.stringify({ ...values, targetDate }),
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
              clientId: values.clientId,
              stage: values.stage,
              targetDate,
              brief: values.brief,
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
          const res = await apiRequest<ProjectMutationResponse>(`/projects/${selected.id}`, {
            method: "PATCH",
            body: JSON.stringify({ ...values, targetDate, expectedUpdatedAt: selected.updatedAt }),
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
                <div className="flex gap-2">
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
