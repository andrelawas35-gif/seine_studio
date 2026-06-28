import { useEffect, useState, useCallback } from "react";
import { Bell, AlertTriangle, Clock, Package, Wrench, FileText, Settings } from "lucide-react";
import { apiRequest, ApiError } from "../api";

interface Notification {
  id: string;
  type: "overdue_invoice" | "due_soon" | "low_stock" | "overdue_repair" | "overdue_project";
  title: string;
  description: string;
  link?: string;
  priority: "high" | "medium" | "low";
  createdAt: string;
}

const USE_API = import.meta.env.VITE_DATA_MODE === "api";

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  overdue_invoice: FileText,
  due_soon: Clock,
  low_stock: Package,
  overdue_repair: Wrench,
  overdue_project: Clock,
};

const COLORS: Record<string, string> = {
  high: "var(--danger)",
  medium: "#E09F3E",
  low: "var(--ink-muted)",
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!USE_API) return;
    setLoading(true);
    try {
      const results: Notification[] = [];

      // Overdue invoices
      try {
        const invoices = await apiRequest<{ data: { id: string; invoiceNumber: string; status: string; clientName: string | null; dueDate: string | null; totalCents: number; paidCents: number }[] }>(
          "/invoices?status=overdue&limit=20",
        );
        for (const inv of invoices.data) {
          results.push({
            id: `overdue-inv-${inv.id}`,
            type: "overdue_invoice" as const,
            title: `Overdue Invoice ${inv.invoiceNumber}`,
            description: `${inv.clientName || "Unknown client"}: ${(inv.totalCents / 100).toLocaleString("en-PH", { style: "currency", currency: "PHP" })} (${((inv.totalCents - inv.paidCents) / 100).toLocaleString("en-PH", { style: "currency", currency: "PHP" })} unpaid)`,
            link: "/invoices",
            priority: "high" as const,
            createdAt: inv.dueDate || "",
          });
        }
      } catch { /* ignore */ }

      // Low stock
      try {
        const inventory = await apiRequest<{ data: { id: string; code: string; description: string; onHand: number; unit: string }[] }>(
          "/inventory?limit=100",
        );
        for (const lot of inventory.data) {
          if (lot.onHand <= 5 && lot.onHand >= 0) {
            results.push({
              id: `low-stock-${lot.id}`,
              type: "low_stock" as const,
              title: `Low Stock: ${lot.description}`,
              description: `${lot.onHand} ${lot.unit} remaining · ${lot.code}`,
              link: "/inventory",
              priority: lot.onHand === 0 ? "high" as const : "medium" as const,
              createdAt: new Date().toISOString(),
            });
          }
        }
      } catch { /* ignore */ }

      // Overdue repair tickets
      try {
        const repairs = await apiRequest<{ data: { id: string; ticketNumber: string; pieceDescription: string; status: string; clientName: string | null; promisedDate: string | null }[] }>(
          "/repairs?overdue=true&limit=20",
        );
        for (const t of repairs.data) {
          results.push({
            id: `overdue-repair-${t.id}`,
            type: "overdue_repair" as const,
            title: `Overdue Repair: ${t.ticketNumber}`,
            description: `${t.pieceDescription} · ${t.clientName || "Unknown client"}`,
            link: "/repairs",
            priority: "high" as const,
            createdAt: t.promisedDate || "",
          });
        }
      } catch { /* ignore */ }

      // Overdue projects (target date passed, not delivered/closed/cancelled)
      try {
        const projects = await apiRequest<{ data: { id: string; projectNumber: string; title: string; stage: string; targetDate: string | null; clientName: string | null }[] }>(
          "/projects?limit=100",
        );
        for (const p of projects.data) {
          if (
            p.targetDate &&
            p.stage !== "delivered" &&
            p.stage !== "closed" &&
            p.stage !== "cancelled" &&
            new Date(p.targetDate) < new Date()
          ) {
            results.push({
              id: `overdue-proj-${p.id}`,
              type: "overdue_project" as const,
              title: `Overdue Project: ${p.projectNumber}`,
              description: `${p.title} · ${p.clientName || "Unknown client"} · Due ${new Date(p.targetDate).toLocaleDateString("en-PH")}`,
              link: "/projects",
              priority: "medium" as const,
              createdAt: p.targetDate,
            });
          }
        }
      } catch { /* ignore */ }

      results.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      setNotifications(results);
    } catch {
      // ignore — notifications are best-effort
    } finally {
      setLoading(false);
    }
  }, []);

  return { notifications, loading, refresh: fetchNotifications };
}

export function NotificationBadge({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative min-h-11 min-w-11 flex items-center justify-center"
      aria-label={`${count} notifications`}
    >
      <Bell size={16} style={{ color: count > 0 ? "var(--foreground)" : "var(--ink-muted)" }} />
      {count > 0 && (
        <span
          className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold"
          style={{ background: "var(--danger)", color: "#fff" }}
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

export function NotificationsPanel({
  notifications,
  onClose,
  onSettingsClick,
}: {
  notifications: Notification[];
  onClose: () => void;
  onSettingsClick: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14" style={{ background: "rgba(23,20,15,0.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }} onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border shadow-xl w-full max-w-sm mx-3 max-h-[70vh] overflow-y-auto"
      >
        <div className="px-4 py-3 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-accent" />
            <h3 className="font-serif text-[15px] text-foreground">Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              {notifications.length} alerts
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onSettingsClick();
              }}
              className="min-h-8 min-w-8 grid place-items-center text-muted-foreground hover:text-foreground transition-colors"
              title="Notification settings"
            >
              <Settings size={13} />
            </button>
          </div>
        </div>

        {notifications.length === 0 && (
          <div className="p-6 text-center text-[13px] text-muted-foreground">
            <Bell size={24} className="mx-auto mb-2 text-accent" />
            All clear — nothing needs attention.
          </div>
        )}

        {notifications.map((n) => {
          const Icon = ICONS[n.type] || Bell;
          return (
            <div
              key={n.id}
              className="px-4 py-3 border-b border-border flex items-start gap-3 hover:bg-muted/40 transition-colors cursor-pointer"
              onClick={() => {
                if (n.link) {
                  window.location.hash = `#${n.link}`;
                }
                onClose();
              }}
            >
              <div className="flex-shrink-0 mt-0.5" style={{ color: COLORS[n.priority] }}>
                <Icon size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium leading-snug text-foreground">{n.title}</p>
                <p className="text-[12px] mt-0.5 leading-snug text-muted-foreground">
                  {n.description}
                </p>
              </div>
              {n.priority === "high" && (
                <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 bg-red-500" />
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
