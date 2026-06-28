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

import { useEffect, useState } from "react";
import { CalendarDays, PackageCheck } from "lucide-react";
import { apiRequest, ApiError } from "../api";

const USE_API = import.meta.env.VITE_DATA_MODE === "api";

interface UpcomingEvent {
  id: string;
  name: string;
  type: string;
  stage: string;
  startsAt: string;
  endsAt: string;
  studioBufferPercent: number;
}

const EVENT_STAGE_PILL: Record<string, string> = {
  draft: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20",
  planning: "bg-blue-50 text-blue-700 border-blue-200",
  packing: "bg-amber-50 text-amber-700 border-amber-200",
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
  active: "bg-green-50 text-green-700 border-green-200",
  reconciliation: "bg-violet-50 text-violet-700 border-violet-200",
  closed: "bg-muted-foreground/5 text-muted-foreground border-muted-foreground/10",
  cancelled: "bg-red-50 text-red-500 border-red-200",
};

function eventDate(iso: string) {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" }).format(new Date(iso));
}

// Manila-local year/month/day for an ISO instant. Returns a comparable yyyymmdd
// number plus parts, so the calendar never drifts a day across the +08:00 offset.
function manilaParts(iso: string) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(iso)).split("-").map(Number);
  return { y, m, d, num: y * 10000 + m * 100 + d };
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

// Compact current-month calendar for the home screen. Days that fall within any
// event's run are marked with a gold dot (the single permitted accent); today
// gets a hairline ring. Calm by design — a glanceable display case, not a planner.
function HomeEventCalendar({ events }: { events: UpcomingEvent[] }) {
  const today = manilaParts(new Date().toISOString());
  const { y, m } = today;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const monthLabel = new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "Asia/Manila" })
    .format(new Date(Date.UTC(y, m - 1, 1)));

  const eventDays = new Set<number>();
  let monthEventCount = 0;
  for (const ev of events) {
    const s = manilaParts(ev.startsAt);
    const e = manilaParts(ev.endsAt);
    let touched = false;
    for (let d = 1; d <= daysInMonth; d++) {
      const num = y * 10000 + m * 100 + d;
      if (num >= s.num && num <= e.num) { eventDays.add(d); touched = true; }
    }
    if (touched) monthEventCount++;
  }

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="bg-card border border-border rounded p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-[#B8975A]" />
          <p className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground">{monthLabel}</p>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {monthEventCount === 0 ? "No events this month" : `${monthEventCount} event${monthEventCount > 1 ? "s" : ""}`}
        </p>
      </div>
      <div className="grid grid-cols-7 gap-y-1.5 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="text-[10px] uppercase tracking-wider text-muted-foreground/60">{w}</span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`e${i}`} />;
          const isToday = day === today.d;
          const hasEvent = eventDays.has(day);
          return (
            <div key={day} className="flex flex-col items-center justify-center h-8">
              <span
                className={`flex items-center justify-center w-7 h-7 text-[12px] font-mono rounded-full ${
                  isToday ? "ring-1 ring-[#B8975A] text-foreground" : "text-foreground/80"
                }`}
              >
                {day}
              </span>
              <span className={`mt-0.5 w-1 h-1 rounded-full ${hasEvent ? "bg-[#B8975A]" : "bg-transparent"}`} />
            </div>
          );
        })}
      </div>
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

  // Events feed (API mode only) — powers both the home calendar and the
  // upcoming-events list. The calendar needs the whole month, not just 5.
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  useEffect(() => {
    if (!USE_API) return;
    apiRequest<{ data: UpcomingEvent[] }>("/events?limit=100")
      .then((res) => setEvents(res.data))
      .catch(() => {});
  }, []);

  const now = new Date();
  const upcomingEvents = events
    .filter((e) => !["closed", "cancelled"].includes(e.stage) && new Date(e.endsAt) >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 sm:space-y-7 max-w-5xl">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard gold label="Active Projects" value={String(active.length)} sub={`${PROJECTS.filter((p) => p.stage === "Production").length} in production`} />
        <MetricCard label="Pipeline Revenue" value={php(pendingRevenue)} sub="Uncommitted pieces" />
        <MetricCard label="Total Clients" value={String(CLIENTS.length)} sub={CLIENTS.length ? "Active clients" : "Add your first client"} />
        <MetricCard label="Awaiting DP" value={String(awaitingDP)} sub="Before production" />
      </div>

      {/* Event calendar — always visible so the month is glanceable */}
      <HomeEventCalendar events={events} />

      {/* Upcoming Events widget */}
      {upcomingEvents.length > 0 && (
        <div className="bg-card border border-border rounded p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={14} className="text-[#B8975A]" />
            <p className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground">Upcoming Events & Pop-ups</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-3 p-3 border border-border/60 rounded bg-muted/20">
                <div className="flex-shrink-0 w-10 h-10 flex flex-col items-center justify-center bg-[#B8975A]/10 border border-[#B8975A]/20 rounded">
                  <span className="text-[10px] uppercase tracking-wider text-[#B8975A] font-medium">
                    {new Date(event.startsAt).toLocaleDateString("en-PH", { month: "short", timeZone: "Asia/Manila" }).slice(0, 3)}
                  </span>
                  <span className="text-[14px] font-mono font-bold text-[#B8975A] leading-none">
                    {new Date(event.startsAt).getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground truncate">{event.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {eventDate(event.startsAt)} – {eventDate(event.endsAt)}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border ${EVENT_STAGE_PILL[event.stage] ?? "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20"}`}>
                      {event.stage.replace("_", " ")}
                    </span>
                    {event.studioBufferPercent > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <PackageCheck size={10} />
                        {event.studioBufferPercent}% buffer
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
