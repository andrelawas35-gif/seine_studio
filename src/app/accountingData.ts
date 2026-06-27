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

export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_QUOTES: Quote[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
