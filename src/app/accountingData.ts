// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue" | "Cancelled";
export type QuoteStatus   = "Draft" | "Sent" | "Accepted" | "Declined" | "Expired";
export type ExpenseCategory = "Materials" | "Tools & Equipment" | "Packaging" | "Marketing" | "Utilities" | "Other";

export interface Invoice {
  id: string;
  projectId: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  lineItems: { description: string; amount: number }[];
  depositPaid: number;
  notes: string;
}

export interface Quote {
  id: string;
  projectId: string;
  clientName: string;
  issueDate: string;
  expiryDate: string;
  status: QuoteStatus;
  lineItems: { description: string; amount: number }[];
  depositRequired: number;
  notes: string;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  supplier: string;
  notes: string;
}

// ─── Initial Accounting Data ──────────────────────────────────────────────────

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: "INV-001", projectId: "P007", clientName: "Ria Bautista",
    issueDate: "2026-06-16", dueDate: "2026-06-23", status: "Paid",
    lineItems: [{ description: "Initial Pendant — RB (14K Yellow Gold, Matte Finish)", amount: 6500 }],
    depositPaid: 3250, notes: "Balance collected on delivery.",
  },
  {
    id: "INV-002", projectId: "P006", clientName: "Isabel Tan",
    issueDate: "2026-06-20", dueDate: "2026-06-27", status: "Sent",
    lineItems: [
      { description: "Diamond Pavé Band — Full Pavé Eternity, 18K White Gold", amount: 30000 },
      { description: "Rush handling fee", amount: 2000 },
    ],
    depositPaid: 16000, notes: "Balance of ₱16,000 due upon delivery.",
  },
  {
    id: "INV-003", projectId: "P002", clientName: "Ana Reyes",
    issueDate: "2026-06-21", dueDate: "2026-06-30", status: "Draft",
    lineItems: [{ description: "18K Solitaire Engagement Ring — 0.5ct Round Brilliant Diamond", amount: 35000 }],
    depositPaid: 17500, notes: "Pending QA completion before sending.",
  },
  {
    id: "INV-004", projectId: "P001", clientName: "Maria Santos",
    issueDate: "2026-06-10", dueDate: "2026-06-24", status: "Overdue",
    lineItems: [{ description: "Baroque Pearl Drop Earrings — South Sea, 18K Gold Fixtures", amount: 18000 }],
    depositPaid: 9000, notes: "Follow up on balance payment.",
  },
];
export const INITIAL_QUOTES: Quote[] = [
  {
    id: "QUO-001", projectId: "P004", clientName: "Camille Lim",
    issueDate: "2026-06-18", expiryDate: "2026-07-02", status: "Sent",
    lineItems: [
      { description: "Layered Chain Necklace — Three-strand 14K Gold, Varying Lengths", amount: 12000 },
      { description: "Custom clasp upgrade", amount: 800 },
    ],
    depositRequired: 6400, notes: "50% deposit required to begin production.",
  },
  {
    id: "QUO-002", projectId: "P005", clientName: "Sofia Cruz",
    issueDate: "2026-06-19", expiryDate: "2026-07-03", status: "Accepted",
    lineItems: [
      { description: "Birthstone Bracelet — Amethyst, Sterling Silver", amount: 4500 },
      { description: "Birthstone Bracelet — Citrine, Sterling Silver", amount: 4000 },
    ],
    depositRequired: 4250, notes: "Client confirmed via email. Awaiting deposit.",
  },
  {
    id: "QUO-003", projectId: "P008", clientName: "Camille Lim",
    issueDate: "2026-06-20", expiryDate: "2026-07-04", status: "Draft",
    lineItems: [{ description: "Freshwater Pearl Studs — Round, 14K Gold Posts", amount: 5500 }],
    depositRequired: 2750, notes: "Waiting for client to confirm pearl size preference.",
  },
];

export const INITIAL_EXPENSES: Expense[] = [
  { id: "EXP-001", date: "2026-06-01", description: "18K Gold Wire Restock", category: "Materials", amount: 106400, supplier: "Precious Metals PH", notes: "28g at ₱3,800/g" },
  { id: "EXP-002", date: "2026-06-03", description: "South Sea Pearl Purchase", category: "Materials", amount: 9600, supplier: "Pearl Traders MNL", notes: "8 pcs at ₱1,200/pc" },
  { id: "EXP-003", date: "2026-06-05", description: "Polishing Tools Kit", category: "Tools & Equipment", amount: 3200, supplier: "Goldsmiths Supply Co.", notes: "Replacement burrs and polishing wheels" },
  { id: "EXP-004", date: "2026-06-10", description: "Kraft Jewelry Boxes (50 pcs)", category: "Packaging", amount: 1500, supplier: "Box & Wrap MNL", notes: "" },
  { id: "EXP-005", date: "2026-06-12", description: "Instagram Promoted Post", category: "Marketing", amount: 1200, supplier: "Meta Ads", notes: "Pavé band reveal post" },
  { id: "EXP-006", date: "2026-06-15", description: "Studio Electricity Bill", category: "Utilities", amount: 2800, supplier: "Meralco", notes: "June billing" },
  { id: "EXP-007", date: "2026-06-18", description: "Round Brilliant Diamonds (2 pcs)", category: "Materials", amount: 17000, supplier: "Gem Traders Makati", notes: "Restocking for P002" },
];
