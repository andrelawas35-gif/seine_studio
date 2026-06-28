import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type CalendarKind = "deadline" | "event" | "invoice" | "repair";

export interface CalendarItem {
  id: string;
  /** ISO date or datetime string. */
  date: string;
  kind: CalendarKind;
  label: string;
  sublabel?: string;
  href: string;
}

const KIND_META: Record<CalendarKind, { label: string; dot: string; pill: string }> = {
  deadline: { label: "Deadlines", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-700 border-amber-200" },
  event: { label: "Events", dot: "bg-[#B8975A]", pill: "bg-[#F5EDD8] text-[#8B6914] border-[#D4B87A]/40" },
  invoice: { label: "Invoices", dot: "bg-violet-500", pill: "bg-violet-50 text-violet-700 border-violet-200" },
  repair: { label: "Repairs", dot: "bg-teal-500", pill: "bg-teal-50 text-teal-700 border-teal-200" },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayKey(date: Date | string) {
  return format(new Date(date), "yyyy-MM-dd");
}

export function OverviewCalendar({
  items,
  onNavigate,
}: {
  items: CalendarItem[];
  onNavigate: (href: string) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = dayKey(item.date);
      const arr = map.get(key);
      if (arr) arr.push(item);
      else map.set(key, [item]);
    }
    return map;
  }, [items]);

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [month]);

  const agendaGroups = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = items
      .filter((item) => new Date(item.date) >= today)
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
      .slice(0, 40);
    const groups: Array<{ key: string; date: Date; items: CalendarItem[] }> = [];
    for (const item of upcoming) {
      const key = dayKey(item.date);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(item);
      else groups.push({ key, date: new Date(item.date), items: [item] });
    }
    return groups;
  }, [items]);

  return (
    <div className="bg-card border border-border rounded overflow-hidden">
      {/* Header — month nav on desktop, "Upcoming" on mobile */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="hidden md:block text-sm font-light text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            {format(month, "MMMM yyyy")}
          </p>
          <p className="md:hidden text-[11px] tracking-[0.18em] uppercase text-muted-foreground">Upcoming</p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-3">
            {(Object.keys(KIND_META) as CalendarKind[]).map((kind) => (
              <span key={kind} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${KIND_META[kind].dot}`} />
                <span className="text-[10px] text-muted-foreground">{KIND_META[kind].label}</span>
              </span>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setMonth((m) => addMonths(m, -1))}
              className="min-h-8 min-w-8 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setMonth(startOfMonth(new Date()))}
              className="px-2 min-h-8 rounded border border-border text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="min-h-8 min-w-8 flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: month grid */}
      <div className="hidden md:block p-4">
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[10px] tracking-widest uppercase text-muted-foreground py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {gridDays.map((day) => {
            const dayItems = itemsByDay.get(dayKey(day)) ?? [];
            const inMonth = isSameMonth(day, month);
            const today = isToday(day);
            return (
              <div
                key={day.toISOString()}
                className="min-h-20 p-1.5 rounded transition-colors"
                style={{
                  border: today ? "1px solid rgba(184,151,90,0.5)" : "1px solid transparent",
                  background: today ? "#FBF7EE" : "transparent",
                  opacity: inMonth ? 1 : 0.4,
                }}
              >
                <p
                  className="text-[10px] font-mono mb-1"
                  style={{ color: today ? "#B8975A" : "var(--muted-foreground)", fontWeight: today ? 600 : 400 }}
                >
                  {format(day, "d")}
                </p>
                <div className="space-y-0.5">
                  {dayItems.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate(item.href)}
                      title={`${item.label}${item.sublabel ? ` · ${item.sublabel}` : ""}`}
                      className={`block w-full truncate rounded border px-1 py-0.5 text-left text-[9px] ${KIND_META[item.kind].pill}`}
                    >
                      {item.label}
                    </button>
                  ))}
                  {dayItems.length > 3 && (
                    <p className="px-1 text-[9px] text-muted-foreground">+{dayItems.length - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: agenda list */}
      <div className="md:hidden">
        {agendaGroups.length === 0 ? (
          <p className="px-4 py-8 text-center text-[12px] text-muted-foreground/60">Nothing scheduled ahead</p>
        ) : (
          agendaGroups.map((group) => (
            <div key={group.key} className="border-b border-border last:border-0">
              <p className="px-4 pt-3 pb-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {format(group.date, "EEE, MMM d")}
              </p>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.href)}
                  className="flex min-h-12 w-full items-center gap-2.5 px-4 py-2 text-left active:bg-muted/30"
                >
                  <span className={`w-1.5 h-1.5 flex-shrink-0 rounded-full ${KIND_META[item.kind].dot}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-foreground">{item.label}</span>
                    {item.sublabel && (
                      <span className="block truncate text-[11px] text-muted-foreground">{item.sublabel}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
