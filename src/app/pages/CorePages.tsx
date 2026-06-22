import { useState } from "react";
import { AlertCircle, MoreHorizontal } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import {
  INITIAL_CLIENTS as CLIENTS,
  INITIAL_INVENTORY as INVENTORY,
  INITIAL_PROJECTS as PROJECTS,
  STOCK_PILL,
  STAGES,
  STAGE_BAR,
  STAGE_DOT,
  STAGE_PILL,
  fmtDate,
  initials,
  php,
} from "../data";
import type { Client, InvCategory, Project, Stage } from "../data";

function MetricCard({
  label, value, sub, gold,
}: {
  label: string; value: string; sub: string; gold?: boolean;
}) {
  return (
    <div
      className="p-5 rounded border"
      style={{
        background: gold ? "#B8975A" : "var(--card)",
        borderColor: gold ? "#A07840" : "var(--border)",
      }}
    >
      <p className="text-[9px] tracking-[0.2em] uppercase font-medium mb-3" style={{ color: gold ? "#F5E8C8" : "var(--muted-foreground)" }}>
        {label}
      </p>
      <p
        className="text-2xl font-light mb-1"
        style={{ fontFamily: "'Playfair Display', serif", color: gold ? "#fff" : "var(--foreground)" }}
      >
        {value}
      </p>
      <p className="text-[10px]" style={{ color: gold ? "rgba(245,232,200,0.7)" : "var(--muted-foreground)" }}>
        {sub}
      </p>
    </div>
  );
}

// ─── Overview Page ────────────────────────────────────────────────────────────

export function OverviewPage() {
  const active = PROJECTS.filter((p) => p.stage !== "Paid");
  const pendingRevenue = active.reduce((s, p) => s + p.price, 0);
  const awaitingDP = PROJECTS.filter((p) => !p.downpaid && !["Inquiry", "Paid"].includes(p.stage)).length;

  const stageCounts = STAGES.map((s) => ({
    stage: s,
    count: PROJECTS.filter((p) => p.stage === s).length,
  }));

  const upcoming = [...PROJECTS]
    .filter((p) => p.stage !== "Paid")
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 5);

  return (
    <div className="space-y-7 max-w-5xl">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard gold label="Active Projects" value={String(active.length)} sub={`${PROJECTS.filter((p) => p.stage === "Production").length} in production`} />
        <MetricCard label="Pipeline Revenue" value={php(pendingRevenue)} sub="Uncommitted pieces" />
        <MetricCard label="Total Clients" value={String(CLIENTS.length)} sub="1 new this month" />
        <MetricCard label="Awaiting Downpayment" value={String(awaitingDP)} sub="Required before production" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="bg-card border border-border rounded p-5 lg:col-span-2">
          <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-5">Project Pipeline</p>
          <div className="space-y-3">
            {stageCounts.map(({ stage, count }) => (
              <div key={stage} className="flex items-center gap-3">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STAGE_DOT[stage]}`} />
                <span className="text-[10px] text-muted-foreground w-20 flex-shrink-0">{stage}</span>
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${STAGE_BAR[stage]}`}
                    style={{ width: `${(count / PROJECTS.length) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-foreground w-3 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded p-5">
          <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-5">Upcoming Deadlines</p>
          <div className="space-y-3.5">
            {upcoming.map((p) => (
              <div key={p.id} className="flex items-start gap-2.5">
                <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${STAGE_DOT[p.stage]}`} />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-foreground truncate leading-tight">{p.name}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{fmtDate(p.due)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-border">
          <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Recent Projects</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Project", "Client", "Stage", "Price", "Due"].map((h) => (
                <th key={h} className="px-5 py-2.5 text-left text-[9px] tracking-[0.15em] uppercase text-muted-foreground font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PROJECTS.slice(0, 5).map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3">
                  <p className="text-[11px] font-medium text-foreground">{p.name}</p>
                  <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{p.id}</p>
                </td>
                <td className="px-5 py-3 text-[11px] text-muted-foreground">{p.client}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-medium rounded border ${STAGE_PILL[p.stage]}`}>
                    <span className={`w-1 h-1 rounded-full ${STAGE_DOT[p.stage]}`} />
                    {p.stage}
                  </span>
                </td>
                <td className="px-5 py-3 text-[11px] font-mono text-foreground">{php(p.price)}</td>
                <td className="px-5 py-3 text-[11px] text-muted-foreground">{fmtDate(p.due)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Projects Page ────────────────────────────────────────────────────────────

function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="w-full bg-card border border-border rounded p-4 space-y-3 hover:border-accent/40 transition-colors text-left group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium text-foreground leading-snug">{project.name}</p>
        <span className="text-muted-foreground flex-shrink-0" aria-hidden="true">
          <MoreHorizontal size={13} />
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{project.description}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className="text-[8px] px-1.5 py-0.5 rounded border font-medium"
          style={{
            background: project.type === "Commission" ? "#F5F2EC" : "#F0EDF8",
            color: project.type === "Commission" ? "#6B5A3A" : "#5B4A8A",
            borderColor: project.type === "Commission" ? "#DDD5C5" : "#C8C0E0",
          }}
        >
          {project.type}
        </span>
        {project.downpaid && (
          <span className="text-[8px] px-1.5 py-0.5 rounded border font-medium bg-[#F5F0E8] text-[#8B6914] border-[#D4B87A]/40">
            Downpaid
          </span>
        )}
      </div>
      <div className="pt-2 border-t border-border flex items-end justify-between">
        <p className="text-[10px] text-muted-foreground">{project.client}</p>
        <div className="text-right">
          <p className="text-[10px] font-mono font-medium text-foreground">{php(project.price)}</p>
          <p className="text-[9px] text-muted-foreground">{fmtDate(project.due)}</p>
        </div>
      </div>
    </button>
  );
}

export function ProjectsPage() {
  const [filter, setFilter] = useState<Stage | "All">("All");
  const navigate = useNavigate();
  const { projectId } = useParams();
  const selectedProject = PROJECTS.find((project) => project.id === projectId);

  const visibleStages = filter === "All" ? STAGES : [filter];

  return (
    <div className="flex flex-col h-full gap-5">
      {selectedProject && (
        <section className="border border-accent/40 bg-card p-4" aria-label={`${selectedProject.name} details`}>
          <div className="flex items-start justify-between gap-4">
            <div><p className="font-serif text-lg text-foreground">{selectedProject.name}</p><p className="mt-1 text-[10px] text-muted-foreground">{selectedProject.id} · {selectedProject.client} · Due {fmtDate(selectedProject.due)}</p></div>
            <button type="button" onClick={() => navigate("/projects")} className="min-h-11 px-3 text-[10px] uppercase tracking-wider text-muted-foreground">Close</button>
          </div>
          <p className="mt-3 max-w-2xl text-[11px] leading-5 text-muted-foreground">{selectedProject.description}</p>
        </section>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(["All", ...STAGES] as (Stage | "All")[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-3 py-1 text-[9px] tracking-[0.15em] uppercase rounded border transition-all"
            style={{
              background: filter === s ? "var(--foreground)" : "var(--card)",
              color: filter === s ? "var(--card)" : "var(--muted-foreground)",
              borderColor: filter === s ? "var(--foreground)" : "var(--border)",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0" style={{ scrollbarWidth: "none" }}>
        {visibleStages.map((stage) => {
          const cards = PROJECTS.filter((p) => p.stage === stage);
          return (
            <div key={stage} className="flex-shrink-0 w-60">
              <div className="flex items-center justify-between mb-3 px-0.5">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${STAGE_DOT[stage]}`} />
                  <span className="text-[9px] tracking-[0.18em] uppercase text-muted-foreground font-medium">{stage}</span>
                </div>
                <span className="text-[9px] text-muted-foreground bg-muted/50 font-mono rounded px-1.5 py-0.5">{cards.length}</span>
              </div>
              <div className="space-y-2.5">
                {cards.map((p) => <ProjectCard key={p.id} project={p} onOpen={() => navigate(`/projects/${p.id}`)} />)}
                {cards.length === 0 && (
                  <div className="border border-dashed border-border rounded p-4 text-center">
                    <p className="text-[10px] text-muted-foreground">Empty</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Clients Page ─────────────────────────────────────────────────────────────

export function ClientsPage() {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const selected: Client = CLIENTS.find((client) => client.id === clientId) || CLIENTS[0];

  return (
    <div className="flex flex-col gap-5 min-h-full max-w-5xl lg:flex-row">
      <div className="w-full flex-shrink-0 space-y-1.5 lg:w-64">
        <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-4 px-1">
          {CLIENTS.length} Clients
        </p>
        {CLIENTS.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(`/clients/${c.id}`)}
            className="w-full flex items-center gap-3 p-3 rounded border text-left transition-all"
            style={{
              background: selected.id === c.id ? "var(--card)" : "transparent",
              borderColor: selected.id === c.id ? "rgba(184,151,90,0.35)" : "var(--border)",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "#EDE5D5" }}
            >
              <span className="text-[10px] font-semibold" style={{ color: "#8B6914" }}>{initials(c.name)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-foreground truncate">{c.name}</p>
              <p className="text-[9px] text-muted-foreground">{c.location}</p>
            </div>
            <p className="text-[9px] font-mono text-muted-foreground flex-shrink-0">{php(c.totalSpent)}</p>
          </button>
        ))}
      </div>

      <div className="flex-1 bg-card border border-border rounded overflow-hidden min-h-0">
        <div className="p-5 border-b border-border flex items-start gap-4">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "#EDE5D5" }}
          >
            <span className="text-sm font-semibold" style={{ color: "#8B6914" }}>{initials(selected.name)}</span>
          </div>
          <div className="flex-1">
            <h2
              className="text-lg font-light text-foreground leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {selected.name}
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">{selected.location} · Client since {selected.since}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground">Total Spent</p>
            <p
              className="text-xl font-light text-foreground mt-1"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {php(selected.totalSpent)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 overflow-auto sm:grid-cols-2 sm:divide-x sm:divide-border">
          <div className="p-5 space-y-5">
            <div>
              <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-3">Contact</p>
              <div className="space-y-2.5">
                <div>
                  <p className="text-[9px] text-muted-foreground mb-0.5">Email</p>
                  <p className="text-[11px] text-foreground">{selected.email}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground mb-0.5">Phone</p>
                  <p className="text-[11px] text-foreground">{selected.phone}</p>
                </div>
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Notes</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{selected.notes}</p>
            </div>
          </div>

          <div className="p-5">
            <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-3">Projects</p>
            <div className="space-y-2.5">
              {selected.projects.map((pid) => {
                const proj = PROJECTS.find((p) => p.id === pid);
                if (!proj) return null;
                return (
                  <div key={pid} className="p-3 bg-background rounded border border-border">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-[11px] font-medium text-foreground leading-snug">{proj.name}</p>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] rounded border flex-shrink-0 ${STAGE_PILL[proj.stage]}`}>
                        {proj.stage}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground">{php(proj.price)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inventory Page ───────────────────────────────────────────────────────────

const INV_CATS: ("All" | InvCategory)[] = ["All", "Gold", "Silver", "Pearls", "Gemstones", "Findings"];

export function InventoryPage() {
  const [cat, setCat] = useState<"All" | InvCategory>("All");
  const navigate = useNavigate();
  const { itemId } = useParams();
  const selectedItem = INVENTORY.find((item) => item.id === itemId);
  const filtered = cat === "All" ? INVENTORY : INVENTORY.filter((i) => i.category === cat);
  const alerts = INVENTORY.filter((i) => i.status !== "Sufficient").length;

  return (
    <div className="max-w-4xl space-y-5">
      {selectedItem && (
        <section className="border border-accent/40 bg-card p-4">
          <div className="flex items-start justify-between gap-4">
            <div><p className="font-serif text-lg text-foreground">{selectedItem.name}</p><p className="mt-1 text-[10px] text-muted-foreground">{selectedItem.id} · {selectedItem.category} · {selectedItem.quantity} {selectedItem.unit} available</p></div>
            <button type="button" onClick={() => navigate("/inventory")} className="min-h-11 px-3 text-[10px] uppercase tracking-wider text-muted-foreground">Close</button>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">Current cost {php(selectedItem.costPerUnit)} per {selectedItem.unit}; stock value {php(selectedItem.quantity * selectedItem.costPerUnit)}.</p>
        </section>
      )}
      {alerts > 0 && (
        <div className="flex items-center gap-2.5 p-3 rounded border bg-amber-50 border-amber-100">
          <AlertCircle size={13} className="text-amber-600 flex-shrink-0" />
          <p className="text-[11px] text-amber-700">
            {alerts} item{alerts !== 1 ? "s" : ""} low or out of stock — reorder recommended.
          </p>
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {INV_CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className="px-3 py-1 text-[9px] tracking-[0.15em] uppercase rounded border transition-all"
            style={{
              background: cat === c ? "var(--foreground)" : "var(--card)",
              color: cat === c ? "var(--card)" : "var(--muted-foreground)",
              borderColor: cat === c ? "var(--foreground)" : "var(--border)",
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="space-y-2 sm:hidden">
        {filtered.map((item) => (
          <button key={item.id} type="button" onClick={() => navigate(`/inventory/${item.id}`)} className="flex min-h-20 w-full items-center justify-between border border-border bg-card p-4 text-left">
            <span><span className="block text-[11px] font-medium text-foreground">{item.name}</span><span className="mt-1 block text-[9px] text-muted-foreground">{item.id} · {item.category} · {php(item.costPerUnit)} / {item.unit}</span></span>
            <span className="text-right"><span className="block font-mono text-[11px]">{item.quantity} {item.unit}</span><span className={`mt-1 inline-block px-2 py-0.5 text-[8px] ${STOCK_PILL[item.status]}`}>{item.status}</span></span>
          </button>
        ))}
      </div>

      <div className="hidden bg-card border border-border rounded overflow-x-auto sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border" style={{ background: "rgba(0,0,0,0.02)" }}>
              {["Item", "Category", "Qty", "Unit", "Cost / Unit", "Stock Value", "Status"].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[8px] tracking-[0.2em] uppercase text-muted-foreground font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} onClick={() => navigate(`/inventory/${item.id}`)} className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-[11px] font-medium text-foreground">{item.name}</p>
                  <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{item.id}</p>
                </td>
                <td className="px-4 py-3 text-[10px] text-muted-foreground">{item.category}</td>
                <td className="px-4 py-3 text-[11px] font-mono text-foreground">{item.quantity}</td>
                <td className="px-4 py-3 text-[10px] text-muted-foreground">{item.unit}</td>
                <td className="px-4 py-3 text-[11px] font-mono text-muted-foreground">{php(item.costPerUnit)}</td>
                <td className="px-4 py-3 text-[11px] font-mono text-foreground">{php(item.quantity * item.costPerUnit)}</td>
                <td className="px-4 py-3">
                  <span className={`text-[9px] px-2 py-0.5 rounded font-medium ${STOCK_PILL[item.status]}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
