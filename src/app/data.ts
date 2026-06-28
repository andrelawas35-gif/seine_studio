// ─── Types ───────────────────────────────────────────────────────────────────

export type Page = "overview" | "projects" | "clients" | "inventory" | "events" | "quotes" | "invoices" | "expenses" | "accounting" | "replies" | "certificates" | "repairs" | "settings" | "consignment";
export type Stage = "Inquiry" | "Design" | "Production" | "QA" | "Delivery" | "Paid";
export type ProjectType = "Commission" | "Collection";
export type StockStatus = "Sufficient" | "Low" | "Out";
export type InvCategory = "Gold" | "Silver" | "Gemstones" | "Pearls" | "Findings";

export interface Project {
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

export interface Client {
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

export interface InventoryItem {
  id: string;
  name: string;
  category: InvCategory;
  quantity: number;
  unit: string;
  costPerUnit: number;
  status: StockStatus;
}

export interface SocialPost {
  id: string;
  date: string;
  platform: "Instagram" | "TikTok" | "Facebook";
  caption: string;
  status: "Posted" | "Scheduled" | "Draft";
  engagement?: number;
}

export interface Notification {
  id: string;
  type: "warning" | "info" | "success";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

// ─── Initial Data ─────────────────────────────────────────────────────────────

export const INITIAL_PROJECTS: Project[] = [];

export const INITIAL_CLIENTS: Client[] = [];

// Seeded from Seine Studio Financial Tracker CSV — real material unit costs
export const INITIAL_INVENTORY: InventoryItem[] = [
  { id: "I001", name: "Freshwater Pearls", category: "Pearls", quantity: 0, unit: "pcs", costPerUnit: 65, status: "Out" },
  { id: "I002", name: "Jump Ring 5-1", category: "Findings", quantity: 0, unit: "pcs", costPerUnit: 40, status: "Out" },
  { id: "I003", name: "Chain", category: "Findings", quantity: 0, unit: "pcs", costPerUnit: 108, status: "Out" },
  { id: "I004", name: "D Carabiner", category: "Findings", quantity: 0, unit: "pcs", costPerUnit: 30.5, status: "Out" },
  { id: "I005", name: "Lock Carabiner", category: "Findings", quantity: 0, unit: "pcs", costPerUnit: 33, status: "Out" },
  { id: "I006", name: "Gemstones", category: "Gemstones", quantity: 0, unit: "pcs", costPerUnit: 150, status: "Out" },
  { id: "I007", name: "Silver (per gram)", category: "Silver", quantity: 0, unit: "g", costPerUnit: 65, status: "Out" },
  { id: "I008", name: "Packaging", category: "Findings", quantity: 0, unit: "pcs", costPerUnit: 150, status: "Out" },
  { id: "I009", name: "Polishing Cloth", category: "Findings", quantity: 0, unit: "pcs", costPerUnit: 16, status: "Out" },
];

export const INITIAL_SOCIAL_POSTS: SocialPost[] = [];

export const INITIAL_NOTIFICATIONS: Notification[] = [];

export const FOLLOWER_DATA: { month: string; instagram: number; tiktok: number }[] = [];

export const ENGAGEMENT_DATA: { week: string; instagram: number; tiktok: number }[] = [];

// ─── Constants ────────────────────────────────────────────────────────────────

export const STAGES: Stage[] = ["Inquiry", "Design", "Production", "QA", "Delivery", "Paid"];

export const STAGE_PILL: Record<Stage, string> = {
  Inquiry: "bg-stone-100 text-stone-600 border-stone-200",
  Design: "bg-sky-50 text-sky-700 border-sky-100",
  Production: "bg-amber-50 text-amber-700 border-amber-100",
  QA: "bg-violet-50 text-violet-700 border-violet-100",
  Delivery: "bg-emerald-50 text-emerald-700 border-emerald-100",
  Paid: "bg-[#F5F0E8] text-[#8B6914] border-[#D4B87A]/40",
};

export const STAGE_DOT: Record<Stage, string> = {
  Inquiry: "bg-stone-400",
  Design: "bg-sky-500",
  Production: "bg-amber-500",
  QA: "bg-violet-500",
  Delivery: "bg-emerald-500",
  Paid: "bg-[#B8975A]",
};

export const STAGE_BAR: Record<Stage, string> = {
  Inquiry: "bg-stone-300",
  Design: "bg-sky-400",
  Production: "bg-amber-400",
  QA: "bg-violet-400",
  Delivery: "bg-emerald-400",
  Paid: "bg-[#B8975A]",
};

export const STOCK_PILL: Record<StockStatus, string> = {
  Sufficient: "text-emerald-700 bg-emerald-50",
  Low: "text-amber-700 bg-amber-50",
  Out: "text-red-600 bg-red-50",
};

export const PLATFORM_COLOR: Record<string, string> = {
  Instagram: "#C13584",
  TikTok: "#010101",
  Facebook: "#1877F2",
};

export const POST_PILL: Record<string, string> = {
  Posted: "bg-emerald-100 text-emerald-700",
  Scheduled: "bg-[#F5EDD8] text-[#8B6914]",
  Draft: "bg-stone-100 text-stone-500",
};

// ─── Utilities ────────────────────────────────────────────────────────────────

export const php = (n: number) => (n === 0 ? "—" : `₱${n.toLocaleString("en-PH")}`);

export const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

export const initials = (name: string) =>
  name === "—"
    ? "—"
    : name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

export const generateId = (prefix: string, existing: { id: string }[]) => {
  const nums = existing.map((e) => parseInt(e.id.replace(prefix, ""), 10)).filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
};
