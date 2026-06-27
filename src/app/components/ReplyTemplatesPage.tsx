import { useEffect, useMemo, useState } from "react";
import { Check, Copy, FilePlus2, History, Search, TriangleAlert } from "lucide-react";
import type { Client, InventoryItem, Project } from "../data";
import { php } from "../data";
import {
  APPROVED_VARIABLES,
  DEFAULT_REPLY_TEMPLATES,
  DEFAULT_STUDIO_POLICIES,
  extractTemplateVariables,
  renderReplyTemplate,
  type ReplyCategory,
  type ReplyTemplate,
  type ReplyVariables,
} from "../replyTemplates";
import { apiRequest } from "../api";

const STORAGE_KEY = "seine.reply-templates.v1";
const CATEGORIES: Array<"All" | ReplyCategory> = [
  "All", "Pricing", "Custom orders", "Payments", "Materials", "Lead times", "Delivery", "Aftercare", "Availability",
];

function readCustomTemplates(): ReplyTemplate[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface Props {
  clients: Client[];
  projects: Project[];
  inventory: InventoryItem[];
}

export function ReplyTemplatesPage({ clients, projects, inventory }: Props) {
  const [customTemplates, setCustomTemplates] = useState<ReplyTemplate[]>(readCustomTemplates);
  const templates = useMemo(() => [...DEFAULT_REPLY_TEMPLATES, ...customTemplates], [customTemplates]);
  const [selectedId, setSelectedId] = useState(DEFAULT_REPLY_TEMPLATES[0].id);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"All" | ReplyCategory>("All");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [material, setMaterial] = useState("");
  const [pieceType, setPieceType] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [policies, setPolicies] = useState(DEFAULT_STUDIO_POLICIES);
  const [editedReply, setEditedReply] = useState("");
  const [copied, setCopied] = useState(false);

  const selected = templates.find((template) => template.id === selectedId) || templates[0];
  const selectedClient = clients.find((client) => client.id === clientId);
  const selectedProject = projects.find((project) => project.id === projectId);
  const variables: ReplyVariables = {
    ...policies,
    client_name: selectedClient?.name || "",
    piece_type: pieceType || selectedProject?.name || "",
    starting_price: startingPrice || (selectedProject?.price ? php(selectedProject.price) : ""),
    material,
  };
  const rendered = renderReplyTemplate(selected.body, variables);

  useEffect(() => {
    setEditedReply(rendered.text);
  }, [selected.id, selected.version, clientId, projectId, pieceType, startingPrice, material, policies]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customTemplates));
  }, [customTemplates]);

  useEffect(() => {
    if (!selectedProject) return;
    const client = clients.find((item) => item.name === selectedProject.client);
    if (client) setClientId(client.id);
  }, [selectedProject, clients]);

  const filtered = templates.filter((template) => {
    const matchesCategory = category === "All" || template.category === category;
    const query = search.trim().toLowerCase();
    return matchesCategory && (!query || `${template.title} ${template.body}`.toLowerCase().includes(query));
  });

  async function duplicateTemplate() {
    const duplicate: ReplyTemplate = {
      ...selected,
      id: newId("reply"),
      title: `${selected.title} copy`,
      body: editedReply,
      version: 1,
      builtIn: false,
      updatedAt: new Date().toISOString(),
    };
    setCustomTemplates((current) => [...current, duplicate]);
    setSelectedId(duplicate.id);

    if (import.meta.env.VITE_DATA_MODE === "api") {
      try {
        await apiRequest("/replies", {
          method: "POST",
          body: JSON.stringify({
            name: duplicate.title,
            category: duplicate.category,
            body: duplicate.body,
            variables: extractTemplateVariables(duplicate.body),
          }),
        });
      } catch {
        // Saved locally; API sync failed silently
      }
    }
  }

  async function saveVersion() {
    const familyTitle = selected.title.replace(/ copy$/, "");
    const versions = templates.filter((template) => template.title.replace(/ copy$/, "") === familyTitle);
    const next: ReplyTemplate = {
      ...selected,
      id: newId("reply-version"),
      title: familyTitle,
      body: editedReply,
      version: Math.max(...versions.map((template) => template.version), selected.version) + 1,
      builtIn: false,
      updatedAt: new Date().toISOString(),
    };
    setCustomTemplates((current) => [...current, next]);
    setSelectedId(next.id);

    if (import.meta.env.VITE_DATA_MODE === "api") {
      try {
        await apiRequest("/replies", {
          method: "POST",
          body: JSON.stringify({
            name: next.title,
            category: next.category,
            body: next.body,
            variables: extractTemplateVariables(next.body),
          }),
        });
      } catch {
        // Saved locally; API sync failed silently
      }
    }
  }

  async function copyReply() {
    await navigator.clipboard.writeText(editedReply);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#B8975A]">Private response library</p>
          <h1 className="mt-1 font-serif text-2xl font-light text-foreground">Instagram inquiry replies</h1>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-muted-foreground">Populate an approved response, review every detail, then copy it into Instagram. No account connection or message content is stored.</p>
        </div>
        <button type="button" onClick={duplicateTemplate} className="min-h-11 border border-border bg-card px-4 text-[12px] uppercase tracking-widest text-foreground">
          <FilePlus2 className="mr-2 inline" size={14} />Duplicate template
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="border border-border bg-card">
          <div className="space-y-3 border-b border-border p-4">
            <label className="relative block">
              <span className="sr-only">Search templates</span>
              <Search className="absolute left-3 top-3 text-muted-foreground" size={13} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search replies" className="min-h-10 w-full border border-border bg-background pl-9 pr-3 text-[11px] outline-none focus:border-[#B8975A]" />
            </label>
            <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className="min-h-10 w-full border border-border bg-background px-3 text-[11px]">
              {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="max-h-[28rem] overflow-auto p-2">
            {filtered.map((template) => (
              <button key={template.id} type="button" onClick={() => setSelectedId(template.id)} className="mb-1 min-h-14 w-full border px-3 py-2 text-left" style={{ borderColor: selected.id === template.id ? "var(--accent)" : "transparent", background: selected.id === template.id ? "#FBF7EE" : "transparent" }}>
                <span className="block text-[11px] font-medium text-foreground">{template.title}</span>
                <span className="mt-1 flex justify-between text-[11px] uppercase tracking-wider text-muted-foreground"><span>{template.category}</span><span>v{template.version}</span></span>
              </button>
            ))}
            {!filtered.length && <p className="p-4 text-center text-[11px] text-muted-foreground">No matching templates.</p>}
          </div>
        </aside>

        <div className="space-y-5">
          <section className="border border-border bg-card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div><p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Populate from records</p><p className="mt-1 text-[12px] text-muted-foreground">Project selection also suggests its client and price.</p></div>
              <span className="text-[11px] text-muted-foreground">{APPROVED_VARIABLES.length} approved fields</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Project"><select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="field"><option value="">Select a project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.id} · {project.name}</option>)}</select></Field>
              <Field label="Client"><select value={clientId} onChange={(event) => setClientId(event.target.value)} className="field"><option value="">Select a client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.location}</option>)}</select></Field>
              <Field label="Piece type"><input value={pieceType} onChange={(event) => setPieceType(event.target.value)} placeholder={selectedProject?.name || "e.g. custom ring"} className="field" /></Field>
              <Field label="Starting price"><input inputMode="decimal" value={startingPrice} onChange={(event) => setStartingPrice(event.target.value)} placeholder={selectedProject?.price ? php(selectedProject.price) : "e.g. PHP 12,000"} className="field" /></Field>
              <Field label="Material"><input list="reply-materials" value={material} onChange={(event) => setMaterial(event.target.value)} placeholder="Type or select material" className="field" /><datalist id="reply-materials">{inventory.map((item) => <option key={item.id} value={item.name} />)}</datalist></Field>
              <Field label="Lead time"><input value={policies.lead_time} onChange={(event) => setPolicies((current) => ({ ...current, lead_time: event.target.value }))} className="field" /></Field>
              <Field label="Deposit"><input value={policies.deposit_percentage} onChange={(event) => setPolicies((current) => ({ ...current, deposit_percentage: event.target.value }))} className="field" /></Field>
              <Field label="Pickup location"><input value={policies.pickup_location} onChange={(event) => setPolicies((current) => ({ ...current, pickup_location: event.target.value }))} className="field" /></Field>
            </div>
          </section>

          <section className="border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <div><p className="font-serif text-base text-foreground">{selected.title}</p><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Version {selected.version} · {selected.builtIn ? "Seine Studio source" : "Local version"}</p></div>
              <button type="button" onClick={saveVersion} className="min-h-11 px-3 text-[12px] uppercase tracking-wider text-muted-foreground"><History className="mr-2 inline" size={14} />Save new version</button>
            </div>
            {rendered.missingVariables.length > 0 && (
              <div className="mx-4 mt-4 flex gap-2 border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900 sm:mx-5"><TriangleAlert size={14} className="shrink-0" /><span>Complete before sending: {rendered.missingVariables.map((name) => name.replaceAll("_", " ")).join(", ")}.</span></div>
            )}
            <div className="p-4 sm:p-5">
              <label className="block text-[11px] uppercase tracking-[0.2em] text-muted-foreground" htmlFor="reply-copy">Editable reply</label>
              <textarea id="reply-copy" value={editedReply} onChange={(event) => setEditedReply(event.target.value)} rows={9} className="mt-2 w-full resize-y border border-border bg-background p-4 text-[13px] leading-6 text-foreground outline-none focus:border-[#B8975A]" />
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={copyReply} disabled={!editedReply.trim()} className="min-h-11 bg-[#17140F] px-5 text-[12px] uppercase tracking-[0.16em] text-white disabled:opacity-40">
                  {copied ? <Check className="mr-2 inline" size={14} /> : <Copy className="mr-2 inline" size={14} />}{copied ? "Copied" : "Copy reply"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
      <style>{`.field{min-height:2.75rem;width:100%;border:1px solid var(--border);background:var(--background);padding:0 .75rem;font-size:11px;outline:none}.field:focus{border-color:#B8975A}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>{children}</label>;
}
