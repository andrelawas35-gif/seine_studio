// ─── Types ───────────────────────────────────────────────────────────────────

export type Page = "overview" | "projects" | "clients" | "inventory" | "accounting" | "replies";
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

export const INITIAL_PROJECTS: Project[] = [
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

export const INITIAL_CLIENTS: Client[] = [
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

export const INITIAL_INVENTORY: InventoryItem[] = [
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

export const INITIAL_SOCIAL_POSTS: SocialPost[] = [
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

export const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: "N001", type: "warning", title: "Low Stock Alert", message: "18K White Gold Wire is running low (5g remaining)", time: "2m ago", read: false },
  { id: "N002", type: "warning", title: "Out of Stock", message: "Citrine Faceted (I010) is out of stock", time: "1h ago", read: false },
  { id: "N003", type: "info", title: "Deadline Approaching", message: "Diamond Pavé Band is due Jun 25", time: "3h ago", read: false },
  { id: "N004", type: "success", title: "Project Completed", message: "Initial Pendant — RB has been marked Paid", time: "1d ago", read: true },
  { id: "N005", type: "info", title: "New Client", message: "Sofia Cruz referred by Ana Reyes joined", time: "2d ago", read: true },
];

export const FOLLOWER_DATA = [
  { month: "Jan", instagram: 1240, tiktok: 890 },
  { month: "Feb", instagram: 1380, tiktok: 1120 },
  { month: "Mar", instagram: 1520, tiktok: 1640 },
  { month: "Apr", instagram: 1710, tiktok: 2200 },
  { month: "May", instagram: 1890, tiktok: 3100 },
  { month: "Jun", instagram: 2050, tiktok: 4280 },
];

export const ENGAGEMENT_DATA = [
  { week: "Wk 1", instagram: 312, tiktok: 2840 },
  { week: "Wk 2", instagram: 1408, tiktok: 0 },
  { week: "Wk 3", instagram: 921, tiktok: 4120 },
  { week: "Wk 4", instagram: 0, tiktok: 0 },
];

// ─── Constants ────────────────────────────────────────────────────────────────

export const STAGES: Stage[] = ["Inquiry", "Design", "Production", "QA", "Delivery", "Paid"];

export const STAGE_PILL: Record<Stage, string> = {
  Inquiry:    "bg-stone-100 text-stone-600 border-stone-200",
  Design:     "bg-sky-50 text-sky-700 border-sky-100",
  Production: "bg-amber-50 text-amber-700 border-amber-100",
  QA:         "bg-violet-50 text-violet-700 border-violet-100",
  Delivery:   "bg-emerald-50 text-emerald-700 border-emerald-100",
  Paid:       "bg-[#F5F0E8] text-[#8B6914] border-[#D4B87A]/40",
};

export const STAGE_DOT: Record<Stage, string> = {
  Inquiry:    "bg-stone-400",
  Design:     "bg-sky-500",
  Production: "bg-amber-500",
  QA:         "bg-violet-500",
  Delivery:   "bg-emerald-500",
  Paid:       "bg-[#B8975A]",
};

export const STAGE_BAR: Record<Stage, string> = {
  Inquiry:    "bg-stone-300",
  Design:     "bg-sky-400",
  Production: "bg-amber-400",
  QA:         "bg-violet-400",
  Delivery:   "bg-emerald-400",
  Paid:       "bg-[#B8975A]",
};

export const STOCK_PILL: Record<StockStatus, string> = {
  Sufficient: "text-emerald-700 bg-emerald-50",
  Low:        "text-amber-700 bg-amber-50",
  Out:        "text-red-600 bg-red-50",
};

export const PLATFORM_COLOR: Record<string, string> = {
  Instagram: "#C13584",
  TikTok:    "#010101",
  Facebook:  "#1877F2",
};

export const POST_PILL: Record<string, string> = {
  Posted:    "bg-emerald-100 text-emerald-700",
  Scheduled: "bg-[#F5EDD8] text-[#8B6914]",
  Draft:     "bg-stone-100 text-stone-500",
};

// ─── Utilities ────────────────────────────────────────────────────────────────

export const php = (n: number) =>
  n === 0 ? "—" : `₱${n.toLocaleString("en-PH")}`;

export const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

export const initials = (name: string) =>
  name === "—" ? "—" : name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export const generateId = (prefix: string, existing: { id: string }[]) => {
  const nums = existing.map(e => parseInt(e.id.replace(prefix, ""), 10)).filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
};
