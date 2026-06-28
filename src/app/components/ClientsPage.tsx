import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Archive, Download, Edit3, Plus, Search, UserRound } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { apiRequest, ApiError } from "../api";
import {
  clientToForm,
  EMPTY_CLIENT_FORM,
  fixtureClientToRecord,
  type ClientActivity,
  type ClientFormValues,
  type ClientRecord,
} from "../clients";
import { INITIAL_CLIENTS, INITIAL_PROJECTS, fmtDate, initials, php } from "../data";
import { Btn, ConfirmDialog, Field, FormRow, Input, Modal, Textarea } from "./Modal";
import { useToast } from "./Toast";
import { exportCsv, exportJson, timestamp } from "../exports";
import { useDraft } from "../useDraft";
import { useOutbox } from "../useOutbox";
import type { Draft } from "../db";

interface ClientListResponse {
  data: Array<Omit<ClientRecord, "source">>;
  pagination: { total: number };
}

interface ClientDetailResponse {
  data: {
    client: Omit<ClientRecord, "source">;
    activity: ClientActivity[];
  };
}

interface ClientMutationResponse {
  data: Omit<ClientRecord, "source">;
}

const USE_DATABASE = import.meta.env.VITE_DATA_MODE === "api";

function asDatabaseClient(client: Omit<ClientRecord, "source">): ClientRecord {
  return { ...client, source: "database" };
}

function ClientForm({
  initial,
  saving,
  onCancel,
  onSave,
  drafts,
  onSaveDraft,
  onLoadDraft,
  onDiscardDraft,
}: {
  initial: ClientFormValues;
  saving: boolean;
  onCancel: () => void;
  onSave: (values: ClientFormValues) => Promise<void>;
  drafts: Draft[];
  onSaveDraft: (values: ClientFormValues) => Promise<void>;
  onLoadDraft: (draft: Draft) => ClientFormValues;
  onDiscardDraft: (id: string) => Promise<void>;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof ClientFormValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!values.name.trim()) {
      setError("Client name is required.");
      return;
    }
    try {
      await onSave(values);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The client could not be saved.");
    }
  }

  return (
    <form id="client-form" onSubmit={submit} className="space-y-4">
      {drafts.length > 0 && (
        <div className="border border-accent/30 bg-accent/5 p-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Saved on this device</p>
          <div className="mt-2 space-y-2">
            {drafts.slice(0, 3).map((draft) => (
              <div key={draft.id} className="flex items-center justify-between gap-2 border-t border-border pt-2">
                <button type="button" onClick={() => setValues(onLoadDraft(draft))} className="min-h-9 min-w-0 flex-1 text-left text-[12px] text-foreground">
                  {(draft.values.name as string) || "Untitled client"} <span className="text-[11px] text-muted-foreground">· {new Date(draft.updatedAt).toLocaleString("en-PH")}</span>
                </button>
                <button type="button" onClick={() => void onDiscardDraft(draft.id)} className="min-h-9 px-2 text-[11px] uppercase tracking-wider text-muted-foreground">Discard</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">{error}</p>}
      <Field label="Client name" required>
        <Input aria-label="Client name" value={values.name} onChange={(event) => set("name", event.target.value)} autoFocus maxLength={160} />
      </Field>
      <FormRow>
        <Field label="Email">
          <Input aria-label="Email" type="email" value={values.email} onChange={(event) => set("email", event.target.value)} maxLength={254} />
        </Field>
        <Field label="Phone">
          <Input aria-label="Phone" value={values.phone} onChange={(event) => set("phone", event.target.value)} maxLength={160} />
        </Field>
      </FormRow>
      <Field label="Instagram">
        <Input aria-label="Instagram" value={values.instagramHandle} onChange={(event) => set("instagramHandle", event.target.value)} placeholder="@handle" maxLength={160} />
      </Field>
      <Field label="Preferences">
        <Textarea aria-label="Preferences" value={values.preferences} onChange={(event) => set("preferences", event.target.value)} placeholder="Materials, styles, sizing, gifting dates..." maxLength={2000} />
      </Field>
      <Field label="Internal notes">
        <Textarea aria-label="Internal notes" value={values.notes} onChange={(event) => set("notes", event.target.value)} maxLength={5000} />
      </Field>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Btn variant="ghost" onClick={() => void onSaveDraft(values)} disabled={saving}>Save draft</Btn>
        <Btn variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Btn>
        <Btn type="submit" disabled={saving}>{saving ? "Saving..." : "Save client"}</Btn>
      </div>
    </form>
  );
}

export function ClientsPage() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const { toast } = useToast();
  const [records, setRecords] = useState<ClientRecord[]>(() => INITIAL_CLIENTS.map(fixtureClientToRecord));
  const [activity, setActivity] = useState<ClientActivity[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(USE_DATABASE);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<"new" | "edit" | null>(null);
  const [saving, setSaving] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const clientDrafts = useDraft<ClientFormValues>("client");
  const outbox = useOutbox();

  async function loadClients() {
    if (!USE_DATABASE) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest<ClientListResponse>("/clients?limit=100");
      setRecords(response.data.map(asDatabaseClient));
    } catch (caught) {
      const message = caught instanceof ApiError && caught.status === 401
        ? "Sign in is required before the shared client workspace can load."
        : caught instanceof Error ? caught.message : "Clients could not be loaded.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadClients();
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return records;
    return records.filter((record) =>
      [record.name, record.email, record.phone, record.instagramHandle]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle)),
    );
  }, [query, records]);

  const selected = records.find((record) => record.id === clientId) ?? records[0];

  useEffect(() => {
    if (!selected) {
      setActivity([]);
      return;
    }
    if (!USE_DATABASE) {
      setActivity([
        {
          id: `fixture-${selected.id}`,
          action: "client.sample_loaded",
          summary: "Loaded from the Phase 0 sample workspace",
          actorName: "Seine Studio",
          createdAt: selected.createdAt,
        },
      ]);
      return;
    }

    let active = true;
    apiRequest<ClientDetailResponse>(`/clients/${selected.id}`)
      .then((response) => {
        if (active) setActivity(response.data.activity);
      })
      .catch(() => {
        if (active) setActivity([]);
      });
    return () => {
      active = false;
    };
  }, [selected?.id]);

  async function saveClient(values: ClientFormValues) {
    setSaving(true);
    try {
      if (editor === "new") {
        if (USE_DATABASE) {
          if (!navigator.onLine) {
            await clientDrafts.save(values);
            toast.info("Draft saved", "This new client remains on this device until you reconnect and submit it.");
            setEditor(null);
            return;
          }
          const response = await apiRequest<ClientMutationResponse>("/clients", {
            method: "POST",
            body: JSON.stringify(values),
          });
          const created = asDatabaseClient(response.data);
          setRecords((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
          navigate(`/clients/${created.id}`);
          if (clientDrafts.activeDraftId) await clientDrafts.discard(clientDrafts.activeDraftId);
        } else {
          const now = new Date().toISOString();
          const created: ClientRecord = {
            ...values,
            id: `sample-${crypto.randomUUID()}`,
            email: values.email || null,
            phone: values.phone || null,
            instagramHandle: values.instagramHandle.replace(/^@/, "") || null,
            preferences: values.preferences || null,
            notes: values.notes || null,
            createdAt: now,
            updatedAt: now,
            source: "fixture",
          };
          setRecords((current) => [...current, created]);
          navigate(`/clients/${created.id}`);
        }
        toast.success("Client added", `${values.name} is now in the workspace.`);
      } else if (selected) {
        if (USE_DATABASE) {
          if (!navigator.onLine) {
            await outbox.add("PATCH", `/clients/${selected.id}`, {
              ...values,
              expectedUpdatedAt: selected.updatedAt,
            });
            setRecords((current) => current.map((record) => record.id === selected.id
              ? {
                  ...record,
                  ...values,
                  email: values.email || null,
                  phone: values.phone || null,
                  instagramHandle: values.instagramHandle.replace(/^@/, "") || null,
                  preferences: values.preferences || null,
                  notes: values.notes || null,
                  updatedAt: new Date().toISOString(),
                }
              : record));
            toast.warning("Change queued", "Use Sync now after reconnecting. The server has not confirmed this edit yet.");
            setEditor(null);
            return;
          }
          const response = await apiRequest<ClientMutationResponse>(`/clients/${selected.id}`, {
            method: "PATCH",
            body: JSON.stringify({ ...values, expectedUpdatedAt: selected.updatedAt }),
          });
          const updated = asDatabaseClient(response.data);
          setRecords((current) => current.map((record) => (record.id === updated.id ? updated : record)));
        } else {
          setRecords((current) => current.map((record) => record.id === selected.id
            ? {
                ...record,
                ...values,
                email: values.email || null,
                phone: values.phone || null,
                instagramHandle: values.instagramHandle.replace(/^@/, "") || null,
                preferences: values.preferences || null,
                notes: values.notes || null,
                updatedAt: new Date().toISOString(),
              }
            : record));
        }
        toast.success("Client updated", `${values.name}'s record was saved.`);
      }
      setEditor(null);
    } finally {
      setSaving(false);
    }
  }

  async function archiveClient() {
    if (!selected) return;
    if (USE_DATABASE && !navigator.onLine) {
      toast.warning("Connection required", "Archiving is permanent for the active workspace and cannot be queued offline.");
      return;
    }
    try {
      if (USE_DATABASE) await apiRequest(`/clients/${selected.id}`, { method: "DELETE" });
      setRecords((current) => current.filter((record) => record.id !== selected.id));
      setQuery("");
      navigate("/clients");
      toast.success("Client archived", `${selected.name} was removed from the active list.`);
    } catch (caught) {
      toast.error("Archive failed", caught instanceof Error ? caught.message : "Please try again.");
    }
  }

  const fixtureClient = selected?.source === "fixture"
    ? INITIAL_CLIENTS.find((client) => client.id === selected.id)
    : undefined;
  const projects = fixtureClient
    ? INITIAL_PROJECTS.filter((project) => fixtureClient.projects.includes(project.id))
    : [];

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-accent">Client registry</p>
          <h2 className="mt-1 font-serif text-2xl text-foreground">Relationships, carefully kept.</h2>
          <p className="mt-1 max-w-xl text-[12px] leading-5 text-muted-foreground">
            Contact details, preferences, internal notes, and a traceable history for every client.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => {
            const cols = [
              { key: "name" as const, label: "Name" },
              { key: "email" as const, label: "Email" },
              { key: "phone" as const, label: "Phone" },
              { key: "instagramHandle" as const, label: "Instagram" },
              { key: "preferences" as const, label: "Preferences" },
              { key: "notes" as const, label: "Notes" },
              { key: "createdAt" as const, label: "Created" },
            ];
            exportCsv(records, cols, `seine-clients-${timestamp()}.csv`);
          }} className="inline-flex min-h-11 items-center gap-2 border border-border px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Download size={13} /> CSV
          </button>
          <button type="button" onClick={() => exportJson(records, `seine-clients-${timestamp()}.json`)} className="inline-flex min-h-11 items-center gap-2 border border-border px-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Download size={13} /> JSON
          </button>
          <button type="button" onClick={() => setEditor("new")} className="inline-flex min-h-11 items-center justify-center gap-2 bg-foreground px-4 text-[12px] uppercase tracking-[0.16em] text-background">
            <Plus size={13} /> Add client
          </button>
        </div>
      </div>

      <div className={`border px-4 py-3 text-[12px] ${USE_DATABASE ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-accent/30 bg-accent/5 text-muted-foreground"}`}>
        {USE_DATABASE ? "Shared Neon workspace · changes are saved for both authorized users." : "Sample workspace · changes last only until this page is refreshed."}
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-4 border border-red-200 bg-red-50 p-4 text-[12px] text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => void loadClients()} className="min-h-11 px-3 uppercase tracking-wider">Retry</button>
        </div>
      )}

      <div className="grid min-h-[560px] border border-border bg-card lg:grid-cols-[300px_1fr]">
        <aside className={`border-b border-border p-4 lg:block lg:border-b-0 lg:border-r ${clientId ? "hidden" : "block"}`}>
          <label className="flex min-h-11 items-center gap-2 border border-border bg-background px-3">
            <Search size={13} className="text-muted-foreground" />
            <span className="sr-only">Search clients</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or contact" className="w-full bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground" />
          </label>
          <p className="px-1 pb-3 pt-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {loading ? "Loading clients" : `${visible.length} active client${visible.length === 1 ? "" : "s"}`}
          </p>
          <div className="max-h-[440px] space-y-1 overflow-auto">
            {visible.map((client) => (
              <button key={client.id} type="button" onClick={() => navigate(`/clients/${client.id}`)} className={`flex min-h-14 w-full items-center gap-3 border px-3 text-left transition-colors ${selected?.id === client.id ? "border-accent/40 bg-accent/5" : "border-transparent hover:border-border"}`}>
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#EDE5D5] text-[12px] font-semibold text-[#8B6914]">{initials(client.name)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-medium text-foreground">{client.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{client.email || client.instagramHandle && `@${client.instagramHandle}` || "Contact not added"}</span>
                </span>
              </button>
            ))}
            {!loading && visible.length === 0 && <p className="border border-dashed border-border p-6 text-center text-[12px] text-muted-foreground">No clients match this search.</p>}
          </div>
        </aside>

        <section className={`min-w-0 lg:block ${clientId ? "block" : "hidden"}`}>
          {!selected ? (
            <div className="flex h-full min-h-80 flex-col items-center justify-center p-8 text-center">
              <UserRound size={24} className="text-accent" />
              <p className="mt-3 font-serif text-lg text-foreground">No client selected</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Add the first client to begin the shared registry.</p>
            </div>
          ) : (
            <>
              <header className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-start sm:justify-between">
                <button type="button" onClick={() => navigate("/clients")} className="min-h-11 self-start text-[11px] uppercase tracking-[0.16em] text-muted-foreground lg:hidden">← All clients</button>
                <div className="flex gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EDE5D5] font-serif text-sm text-[#8B6914]">{initials(selected.name)}</span>
                  <div>
                    <h3 className="font-serif text-xl text-foreground">{selected.name}</h3>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Client since {fmtDate(selected.createdAt)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditor("edit")} className="inline-flex min-h-11 items-center gap-2 border border-border px-3 text-[11px] uppercase tracking-wider text-muted-foreground"><Edit3 size={12} /> Edit</button>
                  <button type="button" onClick={() => setArchiveOpen(true)} className="inline-flex min-h-11 items-center gap-2 px-3 text-[11px] uppercase tracking-wider text-muted-foreground"><Archive size={12} /> Archive</button>
                </div>
              </header>

              <div className="grid sm:grid-cols-2">
                <div className="space-y-5 border-b border-border p-5 sm:border-b-0 sm:border-r">
                  <Detail label="Email" value={selected.email} />
                  <Detail label="Phone" value={selected.phone} />
                  <Detail label="Instagram" value={selected.instagramHandle ? `@${selected.instagramHandle}` : null} />
                  <Detail label="Preferences" value={selected.preferences} multiline />
                  <Detail label="Internal notes" value={selected.notes} multiline />
                </div>
                <div className="space-y-6 p-5">
                  <div>
                    <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Connected work</p>
                    {projects.length ? projects.map((project) => (
                      <div key={project.id} className="mb-2 border border-border bg-background p-3">
                        <p className="text-[11px] font-medium text-foreground">{project.name}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{project.stage} · {php(project.price)}</p>
                      </div>
                    )) : <p className="border border-dashed border-border p-4 text-[12px] text-muted-foreground">Projects and lifetime spend will appear here from their authoritative records.</p>}
                  </div>
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

      <Modal open={editor !== null} onClose={() => setEditor(null)} title={editor === "new" ? "Add client" : "Edit client"} subtitle="Keep only details that help the studio serve the client well." width={560}>
        <ClientForm
          initial={editor === "edit" && selected ? clientToForm(selected) : EMPTY_CLIENT_FORM}
          saving={saving}
          onCancel={() => setEditor(null)}
          onSave={saveClient}
          drafts={clientDrafts.drafts}
          onSaveDraft={async (values) => {
            await clientDrafts.save(values);
            toast.success("Draft saved", "This client draft is stored only on this device.");
          }}
          onLoadDraft={clientDrafts.load}
          onDiscardDraft={clientDrafts.discard}
        />
      </Modal>

      <ConfirmDialog open={archiveOpen} onClose={() => setArchiveOpen(false)} onConfirm={() => void archiveClient()} title="Archive client" message={`Archive ${selected?.name ?? "this client"}? Their historical activity remains preserved.`} confirmLabel="Archive" danger />
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
