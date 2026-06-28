import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { apiRequest, ApiError } from "../api";
import { INITIAL_CLIENTS, INITIAL_PROJECTS, fmtDate } from "../data";
import {
  ACTIVE_STAGES,
  STAGE_DOT_COLOR,
  STAGE_LABELS,
  STAGE_PILL_STYLE,
  fixtureProjectToRecord,
  type ProjectRecord,
  type ProjectStage,
} from "../projects";
import { fixtureClientToRecord, type ClientRecord } from "../clients";
import { EVENT_STAGE_LABELS, type EventRecord } from "../events";
import { ResponsiveTable, type ColumnDef, type MobileCardDef } from "../components/ui/responsive-table";
import { OverviewCalendar, type CalendarItem } from "../components/OverviewCalendar";

const USE_DATABASE = import.meta.env.VITE_DATA_MODE === "api";

const DAY_MS = 24 * 60 * 60 * 1000;

// Lightweight shapes for calendar-only sources (we only read date + label fields).
interface InvoiceLite {
  id: string;
  invoiceNumber: string;
  clientName: string | null;
  status: string;
  dueDate: string | null;
}

interface RepairLite {
  id: string;
  ticketNumber: string;
  clientName: string | null;
  pieceDescription: string;
  status: string;
  promisedDate: string | null;
}

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

function StagePill({ stage }: { stage: ProjectStage }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded border ${STAGE_PILL_STYLE[stage]}`}>
      <span className={`w-1 h-1 rounded-full ${STAGE_DOT_COLOR[stage]}`} />
      {STAGE_LABELS[stage]}
    </span>
  );
}

const recentProjectColumns: ColumnDef<ProjectRecord>[] = [
  {
    key: "project",
    header: "Project",
    cell: (p) => (
      <>
        <p className="text-[13px] font-medium text-foreground">{p.title}</p>
        <p className="text-[12px] text-muted-foreground font-mono mt-0.5">{p.projectNumber}</p>
      </>
    ),
  },
  {
    key: "client",
    header: "Client",
    cell: (p) => <span className="text-[13px] text-muted-foreground">{p.clientName ?? "—"}</span>,
  },
  {
    key: "stage",
    header: "Stage",
    cell: (p) => <StagePill stage={p.stage} />,
  },
  {
    key: "due",
    header: "Due",
    cell: (p) => <span className="text-[13px] text-muted-foreground">{p.targetDate ? fmtDate(p.targetDate) : "—"}</span>,
  },
];

const recentProjectMobile: MobileCardDef<ProjectRecord> = {
  title: (p) => p.title,
  subtitle: (p) => p.clientName ?? "—",
  badge: (p) => <StagePill stage={p.stage} />,
  trailing: (p) => (
    <p className="text-[12px] text-muted-foreground mt-0.5">{p.targetDate ? fmtDate(p.targetDate) : "—"}</p>
  ),
};

// ─── Overview Page ────────────────────────────────────────────────────────────

const ACTIVE_SET = new Set<ProjectStage>(ACTIVE_STAGES);

export function OverviewPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectRecord[]>(() => INITIAL_PROJECTS.map(fixtureProjectToRecord));
  const [clients, setClients] = useState<ClientRecord[]>(() => INITIAL_CLIENTS.map(fixtureClientToRecord));
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceLite[]>([]);
  const [repairs, setRepairs] = useState<RepairLite[]>([]);
  const [loading, setLoading] = useState(USE_DATABASE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!USE_DATABASE) return;
    let active = true;
    setLoading(true);
    setError(null);
    // Projects + clients drive the metrics; events/invoices/repairs only feed the
    // calendar, so a failure in those should not blank the dashboard.
    Promise.allSettled([
      apiRequest<{ data: Array<Omit<ProjectRecord, "source">> }>("/projects?limit=100"),
      apiRequest<{ data: Array<Omit<ClientRecord, "source">> }>("/clients?limit=100"),
      apiRequest<{ data: EventRecord[] }>("/events?limit=100"),
      apiRequest<{ data: InvoiceLite[] }>("/api/invoices?limit=100"),
      apiRequest<{ data: RepairLite[] }>("/repairs?limit=100"),
    ])
      .then(([projectRes, clientRes, eventRes, invoiceRes, repairRes]) => {
        if (!active) return;
        if (projectRes.status === "fulfilled") {
          setProjects(projectRes.value.data.map((p) => ({ ...p, source: "database" as const })));
        }
        if (clientRes.status === "fulfilled") {
          setClients(clientRes.value.data.map((c) => ({ ...c, source: "database" as const })));
        }
        if (eventRes.status === "fulfilled") setEvents(eventRes.value.data);
        if (invoiceRes.status === "fulfilled") setInvoices(invoiceRes.value.data);
        if (repairRes.status === "fulfilled") setRepairs(repairRes.value.data);

        // Surface auth/connectivity failures from the core sources only.
        const core = [projectRes, clientRes].find((r) => r.status === "rejected") as
          | PromiseRejectedResult
          | undefined;
        if (core) {
          const caught = core.reason;
          setError(
            caught instanceof ApiError && caught.status === 401
              ? "Sign in is required before the dashboard can load."
              : caught instanceof Error ? caught.message : "The dashboard could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const weekAhead = now + 7 * DAY_MS;
    const activeProjects = projects.filter((p) => ACTIVE_SET.has(p.stage));
    const dueThisWeek = activeProjects.filter((p) => {
      if (!p.targetDate) return false;
      const t = new Date(p.targetDate).getTime();
      return t >= now && t <= weekAhead;
    }).length;
    const overdue = activeProjects.filter((p) => {
      if (!p.targetDate) return false;
      return new Date(p.targetDate).getTime() < now;
    }).length;
    const inProduction = projects.filter((p) => p.stage === "production").length;

    const stageCounts = ACTIVE_STAGES.map((stage) => ({
      stage,
      count: projects.filter((p) => p.stage === stage).length,
    }));
    const maxStage = Math.max(1, ...stageCounts.map((s) => s.count));

    const upcoming = activeProjects
      .filter((p) => p.targetDate)
      .sort((a, b) => (a.targetDate ?? "").localeCompare(b.targetDate ?? ""))
      .slice(0, 5);

    const recent = [...projects]
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, 5);

    return { activeProjects, dueThisWeek, overdue, inProduction, stageCounts, maxStage, upcoming, recent };
  }, [projects]);

  const calendarItems = useMemo<CalendarItem[]>(() => {
    const items: CalendarItem[] = [];
    for (const p of projects) {
      if (p.targetDate && ACTIVE_SET.has(p.stage)) {
        items.push({
          id: `project-${p.id}`,
          date: p.targetDate,
          kind: "deadline",
          label: p.title,
          sublabel: p.clientName ?? undefined,
          href: `/projects/${p.id}`,
        });
      }
    }
    for (const e of events) {
      if (e.startsAt && e.stage !== "cancelled") {
        items.push({
          id: `event-${e.id}`,
          date: e.startsAt,
          kind: "event",
          label: e.name,
          sublabel: EVENT_STAGE_LABELS[e.stage],
          href: `/events/${e.id}`,
        });
      }
    }
    for (const inv of invoices) {
      if (inv.dueDate && inv.status !== "paid" && inv.status !== "void") {
        items.push({
          id: `invoice-${inv.id}`,
          date: inv.dueDate,
          kind: "invoice",
          label: inv.invoiceNumber,
          sublabel: inv.clientName ?? undefined,
          href: "/invoices",
        });
      }
    }
    for (const r of repairs) {
      if (r.promisedDate && r.status !== "released" && r.status !== "cancelled") {
        items.push({
          id: `repair-${r.id}`,
          date: r.promisedDate,
          kind: "repair",
          label: r.ticketNumber,
          sublabel: r.clientName ?? r.pieceDescription,
          href: "/repairs",
        });
      }
    }
    return items;
  }, [projects, events, invoices, repairs]);

  const upcomingEvents = useMemo(() => {
    const now = Date.now();
    return [...events]
      .filter((e) => e.stage !== "cancelled" && e.startsAt)
      .filter((e) => new Date(e.endsAt ?? e.startsAt).getTime() >= now - DAY_MS)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, 6);
  }, [events]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded border border-border bg-card" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded border border-border bg-card" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-7 max-w-5xl">
      {error && (
        <div className="border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-[12px] rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          gold
          label="Active Projects"
          value={String(stats.activeProjects.length)}
          sub={`${stats.inProduction} in production`}
        />
        <MetricCard
          label="Due This Week"
          value={String(stats.dueThisWeek)}
          sub={stats.dueThisWeek ? "Active deadlines" : "Nothing due soon"}
        />
        <MetricCard
          label="Total Clients"
          value={String(clients.length)}
          sub={clients.length ? "Active clients" : "Add your first client"}
        />
        <MetricCard
          label="Overdue"
          value={String(stats.overdue)}
          sub={stats.overdue ? "Past target date" : "All on track"}
        />
      </div>

      <OverviewCalendar items={calendarItems} onNavigate={navigate} />

      <div className="bg-card border border-border rounded p-4 sm:p-5">
        <p className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground mb-4 sm:mb-5">Project Pipeline</p>
        <div className="space-y-3">
          {stats.stageCounts.map(({ stage, count }) => (
            <div key={stage} className="flex items-center gap-3">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STAGE_DOT_COLOR[stage]}`} />
              <span className="text-[12px] text-muted-foreground w-24 flex-shrink-0">{STAGE_LABELS[stage]}</span>
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent/60"
                  style={{ width: count ? `${(count / stats.maxStage) * 100}%` : "0%" }}
                />
              </div>
              <span className="text-[12px] font-mono text-foreground w-4 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="px-4 sm:px-5 py-3.5 border-b border-border bg-card rounded-t border-x border-t">
          <p className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground">Recent Projects</p>
        </div>
        {stats.recent.length === 0 ? (
          <div className="border-x border-b border-border bg-card rounded-b px-4 sm:px-5 py-8 text-center text-[12px] text-muted-foreground/60">
            No projects yet
          </div>
        ) : (
          <ResponsiveTable
            data={stats.recent}
            keyFn={(p) => p.id}
            onRowClick={(p) => navigate(`/projects/${p.id}`)}
            className="rounded-t-none border-t-0"
            columns={recentProjectColumns}
            mobile={recentProjectMobile}
          />
        )}
      </div>

      <div className="bg-card border border-border rounded overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-center justify-between">
          <p className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground">Events &amp; Pop-ups</p>
          <button
            type="button"
            onClick={() => navigate("/events")}
            className="text-[11px] tracking-[0.14em] uppercase text-accent hover:underline"
          >
            View all
          </button>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="px-4 sm:px-5 py-8 text-center text-[12px] text-muted-foreground/60">No upcoming events</p>
        ) : (
          upcomingEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => navigate(`/events/${event.id}`)}
              className="flex min-h-14 w-full items-center gap-3 border-b border-border px-4 sm:px-5 py-3 text-left last:border-0 hover:bg-muted/30"
            >
              <span className="w-1.5 h-1.5 flex-shrink-0 rounded-full bg-[#B8975A]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-foreground">{event.name}</span>
                <span className="block truncate text-[12px] text-muted-foreground">
                  {fmtDate(event.startsAt)}
                  {event.venue ? ` · ${event.venue}` : ""}
                </span>
              </span>
              <span className="flex-shrink-0 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {EVENT_STAGE_LABELS[event.stage]}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ProjectsPage has been moved to src/app/components/ProjectsPage.tsx
// InventoryPage has been moved to src/app/components/InventoryPage.tsx
