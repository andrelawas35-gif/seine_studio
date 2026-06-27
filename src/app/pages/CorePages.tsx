import {
  INITIAL_CLIENTS as CLIENTS,
  INITIAL_PROJECTS as PROJECTS,
  STAGES,
  STAGE_BAR,
  STAGE_DOT,
  STAGE_PILL,
  fmtDate,
  php,
} from "../data";
import { ResponsiveTable, type ColumnDef, type MobileCardDef } from "../components/ui/responsive-table";

function MetricCard({
  label, value, sub, gold,
}: {
  label: string; value: string; sub: string; gold?: boolean;
}) {
  return (
    <div
      className="p-4 sm:p-5 rounded border"
      style={{
        background: gold ? "#B8975A" : "var(--card)",
        borderColor: gold ? "#A07840" : "var(--border)",
      }}
    >
      <p className="text-[11px] tracking-[0.18em] uppercase font-medium mb-2.5" style={{ color: gold ? "#F5E8C8" : "var(--muted-foreground)" }}>
        {label}
      </p>
      <p
        className="text-xl sm:text-2xl font-light mb-0.5"
        style={{ fontFamily: "'Playfair Display', serif", color: gold ? "#fff" : "var(--foreground)" }}
      >
        {value}
      </p>
      <p className="text-[12px] leading-snug" style={{ color: gold ? "rgba(245,232,200,0.75)" : "var(--muted-foreground)" }}>
        {sub}
      </p>
    </div>
  );
}

// ─── Recent Projects table config ────────────────────────────────────────────

type ProjectRow = (typeof PROJECTS)[number];

const recentProjectColumns: ColumnDef<ProjectRow>[] = [
  {
    key: "project",
    header: "Project",
    cell: (p) => (
      <>
        <p className="text-[13px] font-medium text-foreground">{p.name}</p>
        <p className="text-[12px] text-muted-foreground font-mono mt-0.5">{p.id}</p>
      </>
    ),
  },
  {
    key: "client",
    header: "Client",
    cell: (p) => <span className="text-[13px] text-muted-foreground">{p.client}</span>,
  },
  {
    key: "stage",
    header: "Stage",
    cell: (p) => (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded border ${STAGE_PILL[p.stage]}`}>
        <span className={`w-1 h-1 rounded-full ${STAGE_DOT[p.stage]}`} />
        {p.stage}
      </span>
    ),
  },
  {
    key: "price",
    header: "Price",
    cell: (p) => <span className="text-[13px] font-mono text-foreground tabular-nums">{php(p.price)}</span>,
  },
  {
    key: "due",
    header: "Due",
    cell: (p) => <span className="text-[13px] text-muted-foreground">{fmtDate(p.due)}</span>,
  },
];

const recentProjectMobile: MobileCardDef<ProjectRow> = {
  title: (p) => p.name,
  subtitle: (p) => p.client,
  badge: (p) => (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded border ${STAGE_PILL[p.stage]}`}>
      <span className={`w-1 h-1 rounded-full ${STAGE_DOT[p.stage]}`} />
      {p.stage}
    </span>
  ),
  trailing: (p) => (
    <>
      <p className="text-[13px] font-mono text-foreground tabular-nums">{php(p.price)}</p>
      <p className="text-[12px] text-muted-foreground mt-0.5">{fmtDate(p.due)}</p>
    </>
  ),
};

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
    <div className="space-y-6 sm:space-y-7 max-w-5xl">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard gold label="Active Projects" value={String(active.length)} sub={`${PROJECTS.filter((p) => p.stage === "Production").length} in production`} />
        <MetricCard label="Pipeline Revenue" value={php(pendingRevenue)} sub="Uncommitted pieces" />
        <MetricCard label="Total Clients" value={String(CLIENTS.length)} sub={CLIENTS.length ? "Active clients" : "Add your first client"} />
        <MetricCard label="Awaiting DP" value={String(awaitingDP)} sub="Before production" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
        <div className="bg-card border border-border rounded p-4 sm:p-5 lg:col-span-2">
          <p className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground mb-4 sm:mb-5">Project Pipeline</p>
          <div className="space-y-3">
            {stageCounts.map(({ stage, count }) => (
              <div key={stage} className="flex items-center gap-3">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STAGE_DOT[stage]}`} />
                <span className="text-[12px] text-muted-foreground w-24 flex-shrink-0">{stage}</span>
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${STAGE_BAR[stage]}`}
                    style={{ width: PROJECTS.length ? `${(count / PROJECTS.length) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-[12px] font-mono text-foreground w-4 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded p-4 sm:p-5">
          <p className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground mb-4 sm:mb-5">Upcoming Deadlines</p>
          <div className="space-y-3.5">
            {upcoming.length === 0 && (
              <p className="text-[12px] text-muted-foreground/60 py-4 text-center">No upcoming deadlines</p>
            )}
            {upcoming.map((p) => (
              <div key={p.id} className="flex items-start gap-2.5">
                <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${STAGE_DOT[p.stage]}`} />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate leading-tight">{p.name}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{fmtDate(p.due)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="px-4 sm:px-5 py-3.5 border-b border-border bg-card rounded-t border-x border-t">
          <p className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground">Recent Projects</p>
        </div>
        <ResponsiveTable
          data={PROJECTS.slice(0, 5)}
          keyFn={(p) => p.id}
          className="rounded-t-none border-t-0"
          columns={recentProjectColumns}
          mobile={recentProjectMobile}
        />
      </div>
    </div>
  );
}

// ProjectsPage has been moved to src/app/components/ProjectsPage.tsx
// InventoryPage has been moved to src/app/components/InventoryPage.tsx
