import { useState, useMemo } from "react";
import {
  LayoutDashboard, FolderOpen, Users, Package, Share2,
  Plus, Search, Bell, MoreHorizontal, AlertCircle,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

type Page = "overview" | "projects" | "clients" | "inventory" | "social";
type Stage = "Inquiry" | "Design" | "Production" | "QA" | "Delivery" | "Paid";
type ProjectType = "Commission" | "Collection";
type StockStatus = "Sufficient" | "Low" | "Out";
type InvCategory = "Gold" | "Silver" | "Gemstones" | "Pearls" | "Findings";

interface Project {
  id: string;
  name: string;
  client: string;
  type: ProjectType;
  stage: Stage;
  price: number;
  downpaid: boolean;
  due: string;
  description: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  notes: string;
  totalSpent: number;
  since: string;
  projects: string[];
}

interface InventoryItem {
  id: string;
  name: string;
  category: InvCategory;
  quantity: number;
  unit: string;
  costPerUnit: number;
  status: StockStatus;
}

interface SocialPost {
  id: string;
  date: string;
  platform: "Instagram" | "TikTok" | "Facebook";
  caption: string;
  status: "Posted" | "Scheduled" | "Draft";
  engagement?: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PROJECTS: Project[] = [
  {
    id: "P001", name: "Baroque Pearl Drop Earrings", client: "Maria Santos",
    type: "Commission", stage: "Production", price: 18000, downpaid: true,
    due: "2026-07-10", description: "South Sea pearl drops with 18K gold fixtures. Client requested asymmetric lengths.",
  },
  {
    id: "P002", name: "18K Solitaire Engagement Ring", client: "Ana Reyes",
    type: "Commission", stage: "QA", price: 35000, downpaid: true,
    due: "2026-06-28", description: "Round brilliant 0.5ct diamond, cathedral setting, yellow gold band.",
  },
  {
    id: "P003", name: "Verano Collection 2026", client: "—",
    type: "Collection", stage: "Design", price: 0, downpaid: false,
    due: "2026-08-15", description: "Summer capsule — 6 pieces inspired by Philippine coastal landscapes.",
  },
  {
    id: "P004", name: "Layered Chain Necklace", client: "Camille Lim",
    type: "Commission", stage: "Inquiry", price: 12000, downpaid: false,
    due: "2026-07-30", description: "Three-strand 14K gold chains, varying lengths. Client to confirm final design.",
  },
  {
    id: "P005", name: "Birthstone Bracelet Set", client: "Sofia Cruz",
    type: "Commission", stage: "Design", price: 8500, downpaid: false,
    due: "2026-07-20", description: "Two-piece bracelet with amethyst and citrine, sterling silver.",
  },
  {
    id: "P006", name: "Diamond Pavé Band", client: "Isabel Tan",
    type: "Commission", stage: "Delivery", price: 32000, downpaid: true,
    due: "2026-06-25", description: "Full pavé eternity band, 18K white gold, 1.2ct total weight.",
  },
  {
    id: "P007", name: "Initial Pendant — RB", client: "Ria Bautista",
    type: "Commission", stage: "Paid", price: 6500, downpaid: true,
    due: "2026-06-15", description: "Block letter pendant, 14K yellow gold, matte finish.",
  },
  {
    id: "P008", name: "Freshwater Pearl Studs", client: "Camille Lim",
    type: "Commission", stage: "Inquiry", price: 5500, downpaid: false,
    due: "2026-08-01", description: "Classic round freshwater pearl studs with 14K gold posts.",
  },
];

const CLIENTS: Client[] = [
  {
    id: "C001", name: "Maria Santos", email: "maria.santos@gmail.com",
    phone: "+63 917 234 5678", location: "Makati City",
    notes: "Prefers South Sea pearls. Anniversary in October — follow up then.",
    totalSpent: 42500, since: "March 2024", projects: ["P001"],
  },
  {
    id: "C002", name: "Ana Reyes", email: "ana.reyes@outlook.com",
    phone: "+63 918 345 6789", location: "BGC, Taguig",
    notes: "High-value client. Very detail-oriented — keep communications thorough.",
    totalSpent: 67000, since: "November 2023", projects: ["P002"],
  },
  {
    id: "C003", name: "Camille Lim", email: "camille.lim@yahoo.com",
    phone: "+63 919 456 7890", location: "Quezon City",
    notes: "Repeat client. Prefers minimalist designs in yellow gold.",
    totalSpent: 24000, since: "January 2025", projects: ["P004", "P008"],
  },
  {
    id: "C004", name: "Sofia Cruz", email: "sofiacruz@icloud.com",
    phone: "+63 920 567 8901", location: "Alabang, Muntinlupa",
    notes: "First-time commission. Referred by Ana Reyes.",
    totalSpent: 8500, since: "May 2026", projects: ["P005"],
  },
  {
    id: "C005", name: "Isabel Tan", email: "isabel.tan@gmail.com",
    phone: "+63 921 678 9012", location: "Ortigas, Pasig",
    notes: "Prefers white gold. Birthday in December — worth following up.",
    totalSpent: 32000, since: "September 2025", projects: ["P006"],
  },
  {
    id: "C006", name: "Ria Bautista", email: "ria.bautista@gmail.com",
    phone: "+63 922 789 0123", location: "San Juan City",
    notes: "Prefers quick turnaround. Open to ready-made pieces.",
    totalSpent: 6500, since: "April 2026", projects: ["P007"],
  },
];

const INVENTORY: InventoryItem[] = [
  { id: "I001", name: "18K Yellow Gold Wire", category: "Gold", quantity: 28, unit: "g", costPerUnit: 3800, status: "Sufficient" },
  { id: "I002", name: "14K Yellow Gold Sheet", category: "Gold", quantity: 12, unit: "g", costPerUnit: 2900, status: "Low" },
  { id: "I003", name: "18K White Gold Wire", category: "Gold", quantity: 5, unit: "g", costPerUnit: 4100, status: "Low" },
  { id: "I004", name: "Sterling Silver Wire", category: "Silver", quantity: 95, unit: "g", costPerUnit: 42, status: "Sufficient" },
  { id: "I005", name: "Sterling Silver Sheet", category: "Silver", quantity: 60, unit: "g", costPerUnit: 38, status: "Sufficient" },
  { id: "I006", name: "South Sea Pearls 10–11mm", category: "Pearls", quantity: 8, unit: "pcs", costPerUnit: 1200, status: "Low" },
  { id: "I007", name: "Freshwater Pearls 7–8mm", category: "Pearls", quantity: 44, unit: "pcs", costPerUnit: 180, status: "Sufficient" },
  { id: "I008", name: "Round Brilliant Diamonds", category: "Gemstones", quantity: 6, unit: "pcs", costPerUnit: 8500, status: "Low" },
  { id: "I009", name: "Amethyst Cabochon", category: "Gemstones", quantity: 14, unit: "pcs", costPerUnit: 320, status: "Sufficient" },
  { id: "I010", name: "Citrine Faceted", category: "Gemstones", quantity: 0, unit: "pcs", costPerUnit: 280, status: "Out" },
  { id: "I011", name: "14K Gold Spring Ring Clasps", category: "Findings", quantity: 18, unit: "pcs", costPerUnit: 140, status: "Sufficient" },
  { id: "I012", name: "14K Gold Earring Posts", category: "Findings", quantity: 30, unit: "pairs", costPerUnit: 95, status: "Sufficient" },
  { id: "I013", name: "Gold Crimp Beads", category: "Findings", quantity: 0, unit: "packs", costPerUnit: 85, status: "Out" },
];

const SOCIAL_POSTS: SocialPost[] = [
  { id: "S001", date: "2026-06-02", platform: "Instagram", caption: "Behind the bench — setting South Sea pearls for our latest commission.", status: "Posted", engagement: 312 },
  { id: "S002", date: "2026-06-05", platform: "TikTok", caption: "How we achieve a perfect pavé setting. Process video.", status: "Posted", engagement: 2840 },
  { id: "S003", date: "2026-06-09", platform: "Instagram", caption: "New arrival: 18K gold baroque drop earrings.", status: "Posted", engagement: 487 },
  { id: "S004", date: "2026-06-12", platform: "Instagram", caption: "Client reveal — the engagement ring she said yes to.", status: "Posted", engagement: 921 },
  { id: "S005", date: "2026-06-15", platform: "Facebook", caption: "Verano Collection 2026 — coming this August.", status: "Posted", engagement: 203 },
  { id: "S006", date: "2026-06-19", platform: "TikTok", caption: "From sketch to setting — full commission walkthrough.", status: "Posted", engagement: 4120 },
  { id: "S007", date: "2026-06-23", platform: "Instagram", caption: "Custom initial pendants — a personal touch for everyday wear.", status: "Scheduled" },
  { id: "S008", date: "2026-06-26", platform: "Instagram", caption: "Pearl care tips — how to keep your pieces lustrous.", status: "Draft" },
  { id: "S009", date: "2026-06-30", platform: "TikTok", caption: "June wrap — pieces made this month.", status: "Draft" },
];

const FOLLOWER_DATA = [
  { month: "Jan", instagram: 1240, tiktok: 890 },
  { month: "Feb", instagram: 1380, tiktok: 1120 },
  { month: "Mar", instagram: 1520, tiktok: 1640 },
  { month: "Apr", instagram: 1710, tiktok: 2200 },
  { month: "May", instagram: 1890, tiktok: 3100 },
  { month: "Jun", instagram: 2050, tiktok: 4280 },
];

const ENGAGEMENT_DATA = [
  { week: "Wk 1", instagram: 312, tiktok: 2840 },
  { week: "Wk 2", instagram: 1408, tiktok: 0 },
  { week: "Wk 3", instagram: 921, tiktok: 4120 },
  { week: "Wk 4", instagram: 0, tiktok: 0 },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES: Stage[] = ["Inquiry", "Design", "Production", "QA", "Delivery", "Paid"];

const STAGE_PILL: Record<Stage, string> = {
  Inquiry:    "bg-stone-100 text-stone-600 border-stone-200",
  Design:     "bg-sky-50 text-sky-700 border-sky-100",
  Production: "bg-amber-50 text-amber-700 border-amber-100",
  QA:         "bg-violet-50 text-violet-700 border-violet-100",
  Delivery:   "bg-emerald-50 text-emerald-700 border-emerald-100",
  Paid:       "bg-[#F5F0E8] text-[#8B6914] border-[#D4B87A]/40",
};

const STAGE_DOT: Record<Stage, string> = {
  Inquiry:    "bg-stone-400",
  Design:     "bg-sky-500",
  Production: "bg-amber-500",
  QA:         "bg-violet-500",
  Delivery:   "bg-emerald-500",
  Paid:       "bg-[#B8975A]",
};

const STAGE_BAR: Record<Stage, string> = {
  Inquiry:    "bg-stone-300",
  Design:     "bg-sky-400",
  Production: "bg-amber-400",
  QA:         "bg-violet-400",
  Delivery:   "bg-emerald-400",
  Paid:       "bg-[#B8975A]",
};

const STOCK_PILL: Record<StockStatus, string> = {
  Sufficient: "text-emerald-700 bg-emerald-50",
  Low:        "text-amber-700 bg-amber-50",
  Out:        "text-red-600 bg-red-50",
};

const PLATFORM_COLOR: Record<string, string> = {
  Instagram: "#C13584",
  TikTok:    "#010101",
  Facebook:  "#1877F2",
};

const POST_PILL: Record<string, string> = {
  Posted:    "bg-emerald-100 text-emerald-700",
  Scheduled: "bg-[#F5EDD8] text-[#8B6914]",
  Draft:     "bg-stone-100 text-stone-500",
};

// ─── Utilities ────────────────────────────────────────────────────────────────

const php = (n: number) =>
  n === 0 ? "—" : `₱${n.toLocaleString("en-PH")}`;

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

const initials = (name: string) =>
  name === "—" ? "—" : name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV = [
  { id: "overview",   label: "Overview",     icon: LayoutDashboard },
  { id: "projects",   label: "Projects",     icon: FolderOpen },
  { id: "clients",    label: "Clients",      icon: Users },
  { id: "inventory",  label: "Inventory",    icon: Package },
  { id: "social",     label: "Social Media", icon: Share2 },
] as const;

function Sidebar({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  return (
    <aside className="w-52 flex-shrink-0 flex flex-col h-full" style={{ background: "#17140F" }}>
      <div className="px-5 pt-7 pb-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-sm flex items-center justify-center" style={{ background: "#B8975A" }}>
            <span className="text-[8px] font-bold tracking-wider" style={{ color: "#17140F" }}>GL</span>
          </div>
          <div>
            <p className="text-white text-xs font-medium tracking-wide" style={{ fontFamily: "'Playfair Display', serif" }}>
              GemLogic
            </p>
            <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: "#4A4030" }}>Atelier</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2.5 py-3 space-y-0.5">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => setPage(id as Page)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-left transition-all duration-100"
              style={{
                background: active ? "rgba(184,151,90,0.12)" : "transparent",
                color: active ? "#B8975A" : "#5A4E3C",
              }}
              onMouseEnter={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#C8BEA8";
              }}
              onMouseLeave={(e) => {
                if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#5A4E3C";
              }}
            >
              <Icon size={14} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[11px] tracking-wide font-medium">{label}</span>
              {active && <span className="ml-auto w-1 h-1 rounded-full" style={{ background: "#B8975A" }} />}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#2A2318" }}>
            <span className="text-[10px] font-semibold" style={{ color: "#B8975A" }}>Yo</span>
          </div>
          <div>
            <p className="text-[11px] font-medium" style={{ color: "#C8BEA8" }}>Designer</p>
            <p className="text-[9px]" style={{ color: "#3A3020" }}>Manila, PH</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────

const PAGE_TITLE: Record<Page, string> = {
  overview:  "Overview",
  projects:  "Projects",
  clients:   "Clients",
  inventory: "Inventory",
  social:    "Social Media",
};

function TopBar({ page }: { page: Page }) {
  return (
    <header className="h-12 border-b border-border flex items-center justify-between px-7 bg-card flex-shrink-0">
      <p
        className="text-[11px] tracking-[0.2em] uppercase text-muted-foreground font-medium"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {PAGE_TITLE[page]}
      </p>
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search…"
            className="pl-7 pr-3 py-1.5 text-[11px] rounded border border-border bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/40 w-44 transition-all"
          />
        </div>
        <button className="relative p-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <Bell size={14} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent" />
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-[11px] font-medium rounded hover:opacity-90 transition-opacity" style={{ color: "#FAF7F0" }}>
          <Plus size={11} />
          New
        </button>
      </div>
    </header>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

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

function OverviewPage() {
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
      <div className="grid grid-cols-4 gap-4">
        <MetricCard gold label="Active Projects" value={String(active.length)} sub={`${PROJECTS.filter((p) => p.stage === "Production").length} in production`} />
        <MetricCard label="Pipeline Revenue" value={php(pendingRevenue)} sub="Uncommitted pieces" />
        <MetricCard label="Total Clients" value={String(CLIENTS.length)} sub="1 new this month" />
        <MetricCard label="Awaiting Downpayment" value={String(awaitingDP)} sub="Required before production" />
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 bg-card border border-border rounded p-5">
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

      <div className="bg-card border border-border rounded overflow-hidden">
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

function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="bg-card border border-border rounded p-4 space-y-3 hover:border-accent/40 transition-colors cursor-default group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium text-foreground leading-snug">{project.name}</p>
        <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground flex-shrink-0">
          <MoreHorizontal size={13} />
        </button>
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
    </div>
  );
}

function ProjectsPage() {
  const [filter, setFilter] = useState<Stage | "All">("All");

  const visibleStages = filter === "All" ? STAGES : [filter];

  return (
    <div className="flex flex-col h-full gap-5">
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
                {cards.map((p) => <ProjectCard key={p.id} project={p} />)}
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

function ClientsPage() {
  const [selected, setSelected] = useState<Client>(CLIENTS[0]);

  return (
    <div className="flex gap-5 h-full max-w-5xl">
      <div className="w-64 flex-shrink-0 space-y-1.5">
        <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-4 px-1">
          {CLIENTS.length} Clients
        </p>
        {CLIENTS.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c)}
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

        <div className="grid grid-cols-2 divide-x divide-border overflow-auto">
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

function InventoryPage() {
  const [cat, setCat] = useState<"All" | InvCategory>("All");
  const filtered = cat === "All" ? INVENTORY : INVENTORY.filter((i) => i.category === cat);
  const alerts = INVENTORY.filter((i) => i.status !== "Sufficient").length;

  return (
    <div className="max-w-4xl space-y-5">
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

      <div className="bg-card border border-border rounded overflow-hidden">
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
              <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
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

// ─── Social Page ──────────────────────────────────────────────────────────────

function SocialPage() {
  const [view, setView] = useState<"calendar" | "analytics">("calendar");

  const firstDayOfMonth = new Date(2026, 5, 1).getDay();
  const daysInMonth = 30;
  const calCells = Array.from({ length: firstDayOfMonth + daysInMonth }, (_, i) =>
    i < firstDayOfMonth ? null : i - firstDayOfMonth + 1
  );

  const postsByDate = useMemo(() => {
    const map: Record<string, SocialPost[]> = {};
    SOCIAL_POSTS.forEach((p) => {
      if (!map[p.date]) map[p.date] = [];
      map[p.date].push(p);
    });
    return map;
  }, []);

  const tooltipStyle = {
    fontSize: 11,
    border: "1px solid rgba(23,20,15,0.1)",
    borderRadius: 2,
    background: "#FAF7F0",
    color: "#17140F",
  };

  return (
    <div className="max-w-5xl space-y-5">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Instagram", value: "2,050", delta: "+160 this month" },
          { label: "TikTok", value: "4,280", delta: "+1,180 this month" },
          { label: "Posts in June", value: "6 posted", delta: "3 upcoming" },
          { label: "Avg. Engagement", value: "1,664", delta: "per post" },
        ].map(({ label, value, delta }) => (
          <div key={label} className="bg-card border border-border rounded p-4">
            <p className="text-[9px] tracking-[0.18em] uppercase text-muted-foreground mb-2">{label}</p>
            <p className="text-lg font-light text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{value}</p>
            <p className="text-[9px] mt-0.5" style={{ color: "#B8975A" }}>{delta}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-0.5 p-0.5 rounded border border-border bg-muted/30 w-fit">
        {(["calendar", "analytics"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="px-4 py-1.5 text-[9px] tracking-[0.15em] uppercase rounded transition-all"
            style={{
              background: view === v ? "var(--card)" : "transparent",
              color: view === v ? "var(--foreground)" : "var(--muted-foreground)",
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "calendar" && (
        <div className="bg-card border border-border rounded overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
            <p className="text-sm font-light text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              June 2026
            </p>
            <div className="flex items-center gap-4">
              {[
                { label: "Posted", cls: "bg-emerald-400" },
                { label: "Scheduled", cls: "bg-[#B8975A]" },
                { label: "Draft", cls: "bg-stone-300" },
              ].map(({ label, cls }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${cls}`} />
                  <span className="text-[9px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-7 mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center text-[9px] tracking-widest uppercase text-muted-foreground py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {calCells.map((day, i) => {
                if (!day) return <div key={`e${i}`} />;
                const key = `2026-06-${String(day).padStart(2, "0")}`;
                const posts = postsByDate[key] || [];
                const isToday = day === 21;
                return (
                  <div
                    key={day}
                    className="min-h-14 p-1.5 rounded transition-colors"
                    style={{
                      border: isToday ? "1px solid rgba(184,151,90,0.5)" : "1px solid transparent",
                      background: isToday ? "#FBF7EE" : "transparent",
                    }}
                  >
                    <p
                      className="text-[10px] font-mono mb-1"
                      style={{ color: isToday ? "#B8975A" : "var(--muted-foreground)", fontWeight: isToday ? 600 : 400 }}
                    >
                      {day}
                    </p>
                    <div className="space-y-0.5">
                      {posts.map((post) => (
                        <div
                          key={post.id}
                          className={`text-[8px] px-1 py-0.5 rounded truncate ${POST_PILL[post.status]}`}
                          title={post.caption}
                        >
                          {post.platform[0]} · {post.caption.slice(0, 16)}…
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {view === "analytics" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-card border border-border rounded p-5">
              <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-5">Follower Growth</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={FOLLOWER_DATA}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#7A6F5E" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#7A6F5E" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="instagram" stroke="#C13584" strokeWidth={1.5} dot={false} name="Instagram" />
                  <Line type="monotone" dataKey="tiktok" stroke="#17140F" strokeWidth={1.5} dot={false} name="TikTok" />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-3">
                {[{ label: "Instagram", color: "#C13584" }, { label: "TikTok", color: "#17140F" }].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-4 h-px inline-block" style={{ background: color }} />
                    <span className="text-[9px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded p-5">
              <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-5">Weekly Engagement — June</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={ENGAGEMENT_DATA} barSize={14} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#7A6F5E" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#7A6F5E" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="instagram" fill="#C13584" fillOpacity={0.7} radius={[2, 2, 0, 0]} name="Instagram" />
                  <Bar dataKey="tiktok" fill="#B8975A" fillOpacity={0.85} radius={[2, 2, 0, 0]} name="TikTok" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border">
              <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Posts — June 2026</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border" style={{ background: "rgba(0,0,0,0.02)" }}>
                  {["Date", "Platform", "Caption", "Status", "Engagement"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[8px] tracking-[0.2em] uppercase text-muted-foreground font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SOCIAL_POSTS.map((post) => (
                  <tr key={post.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-[10px] font-mono text-muted-foreground">{post.date}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-medium" style={{ color: PLATFORM_COLOR[post.platform] }}>
                        {post.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-foreground max-w-xs">
                      <p className="truncate">{post.caption}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-medium ${POST_PILL[post.status]}`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono text-muted-foreground">
                      {post.engagement ? post.engagement.toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>("overview");

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ fontFamily: "'DM Sans', sans-serif", background: "var(--background)" }}
    >
      <Sidebar page={page} setPage={setPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar page={page} />
        <main
          className="flex-1 overflow-y-auto p-7"
          style={{ scrollbarWidth: "none" }}
        >
          {page === "overview"  && <OverviewPage />}
          {page === "projects"  && <ProjectsPage />}
          {page === "clients"   && <ClientsPage />}
          {page === "inventory" && <InventoryPage />}
          {page === "social"    && <SocialPage />}
        </main>
      </div>
    </div>
  );
}
