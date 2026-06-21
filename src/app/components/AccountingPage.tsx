import { useState, useMemo } from "react";
import {
  Receipt, FileText, TrendingUp, TrendingDown, DollarSign,
  Plus, MoreHorizontal, ChevronDown, AlertCircle, CheckCircle2,
  Clock, Send, Download, Filter,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { php, fmtDate, initials, generateId, STAGE_DOT } from "../data";
import type { Project, Client } from "../data";
import { Modal, ConfirmDialog, Field, Input, Textarea, Select, FormRow, Btn } from "../components/Modal";
import { useToast } from "../components/Toast";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const invoiceTotal  = (inv: Invoice) => inv.lineItems.reduce((s, l) => s + l.amount, 0);
const quoteTotal    = (q: Quote)     => q.lineItems.reduce((s, l) => s + l.amount, 0);

const STATUS_INV: Record<InvoiceStatus, { bg: string; text: string; icon: React.ReactNode }> = {
  Draft:     { bg: "bg-stone-100 text-stone-500", text: "Draft",     icon: <FileText size={10} /> },
  Sent:      { bg: "bg-sky-50 text-sky-700",      text: "Sent",      icon: <Send size={10} /> },
  Paid:      { bg: "bg-emerald-50 text-emerald-700", text: "Paid",   icon: <CheckCircle2 size={10} /> },
  Overdue:   { bg: "bg-red-50 text-red-600",      text: "Overdue",   icon: <AlertCircle size={10} /> },
  Cancelled: { bg: "bg-stone-100 text-stone-400", text: "Cancelled", icon: <MoreHorizontal size={10} /> },
};

const STATUS_QUO: Record<QuoteStatus, { bg: string; text: string }> = {
  Draft:    { bg: "bg-stone-100 text-stone-500",    text: "Draft" },
  Sent:     { bg: "bg-sky-50 text-sky-700",          text: "Sent" },
  Accepted: { bg: "bg-emerald-50 text-emerald-700",  text: "Accepted" },
  Declined: { bg: "bg-red-50 text-red-600",          text: "Declined" },
  Expired:  { bg: "bg-amber-50 text-amber-600",      text: "Expired" },
};

const EXP_CATS: ExpenseCategory[] = ["Materials", "Tools & Equipment", "Packaging", "Marketing", "Utilities", "Other"];

const tooltipStyle = {
  fontSize: 11,
  border: "1px solid rgba(23,20,15,0.1)",
  borderRadius: 2,
  background: "#FAF7F0",
  color: "#17140F",
};

// ─── Revenue Chart Data ───────────────────────────────────────────────────────

const REVENUE_DATA = [
  { month: "Jan", collected: 24000, outstanding: 8000, expenses: 14000 },
  { month: "Feb", collected: 31000, outstanding: 12000, expenses: 18000 },
  { month: "Mar", collected: 18500, outstanding: 6000, expenses: 11000 },
  { month: "Apr", collected: 42000, outstanding: 0, expenses: 22000 },
  { month: "May", collected: 28000, outstanding: 18000, expenses: 15000 },
  { month: "Jun", collected: 38500, outstanding: 44500, expenses: 28000 },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground font-medium">{title}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function StatCard({ label, value, sub, trend, accent }: {
  label: string; value: string; sub: string; trend?: "up" | "down" | "neutral"; accent?: boolean;
}) {
  return (
    <div
      className="p-5 rounded border transition-all"
      style={{
        background: accent ? "#B8975A" : "var(--card)",
        borderColor: accent ? "#A07840" : "var(--border)",
      }}
    >
      <p className="text-[9px] tracking-[0.2em] uppercase font-medium mb-3"
        style={{ color: accent ? "#F5E8C8" : "var(--muted-foreground)" }}>
        {label}
      </p>
      <p className="text-2xl font-light mb-1"
        style={{ fontFamily: "'Playfair Display', serif", color: accent ? "#fff" : "var(--foreground)" }}>
        {value}
      </p>
      <div className="flex items-center gap-1">
        {trend === "up" && <TrendingUp size={10} style={{ color: accent ? "#F5E8C8" : "#10b981" }} />}
        {trend === "down" && <TrendingDown size={10} style={{ color: accent ? "#F5E8C8" : "#ef4444" }} />}
        <p className="text-[10px]" style={{ color: accent ? "rgba(245,232,200,0.7)" : "var(--muted-foreground)" }}>{sub}</p>
      </div>
    </div>
  );
}

// ─── Invoice Modal ────────────────────────────────────────────────────────────

function InvoiceModal({
  open, onClose, invoice, projects, onSave,
}: {
  open: boolean;
  onClose: () => void;
  invoice?: Invoice;
  projects: Project[];
  onSave: (inv: Invoice) => void;
}) {
  const isEdit = !!invoice;
  const [form, setForm] = useState<Omit<Invoice, "id" | "lineItems">>({
    projectId: invoice?.projectId ?? "",
    clientName: invoice?.clientName ?? "",
    issueDate: invoice?.issueDate ?? new Date().toISOString().slice(0, 10),
    dueDate: invoice?.dueDate ?? "",
    status: invoice?.status ?? "Draft",
    depositPaid: invoice?.depositPaid ?? 0,
    notes: invoice?.notes ?? "",
  });
  const [desc, setDesc] = useState(invoice?.lineItems[0]?.description ?? "");
  const [amount, setAmount] = useState(invoice?.lineItems[0]?.amount ?? 0);
  const { toast } = useToast();

  const handleProjectChange = (pid: string) => {
    const proj = projects.find(p => p.id === pid);
    setForm(f => ({ ...f, projectId: pid, clientName: proj?.client ?? "" }));
    if (proj) {
      setDesc(proj.name);
      setAmount(proj.price);
    }
  };

  const handleSave = () => {
    if (!form.projectId || !form.dueDate || !desc || amount <= 0) {
      toast.error("Please fill all required fields");
      return;
    }
    onSave({
      id: invoice?.id ?? "",
      ...form,
      lineItems: [{ description: desc, amount }],
    });
    onClose();
    toast.success(isEdit ? "Invoice updated" : "Invoice created", form.clientName);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Invoice" : "New Invoice"}
      subtitle="Generate a professional invoice tied to a project"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={handleSave}>{isEdit ? "Save Changes" : "Create Invoice"}</Btn></>}
    >
      <div className="space-y-4">
        <Field label="Project" required>
          <Select value={form.projectId} onChange={e => handleProjectChange(e.target.value)}>
            <option value="">Select project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <FormRow>
          <Field label="Issue Date" required>
            <Input type="date" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} />
          </Field>
          <Field label="Due Date" required>
            <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </Field>
        </FormRow>
        <Field label="Line Item Description" required>
          <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="E.g. Custom engagement ring, 18K gold…" />
        </Field>
        <FormRow>
          <Field label="Amount (₱)" required>
            <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} min={0} />
          </Field>
          <Field label="Deposit Paid (₱)">
            <Input type="number" value={form.depositPaid} onChange={e => setForm(f => ({ ...f, depositPaid: Number(e.target.value) }))} min={0} />
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Status">
            <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as InvoiceStatus }))}>
              {(["Draft", "Sent", "Paid", "Overdue", "Cancelled"] as InvoiceStatus[]).map(s =>
                <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        </FormRow>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment terms, special instructions…" rows={2} />
        </Field>
        {amount > 0 && (
          <div className="p-3 rounded border bg-[#F5F0E8] border-[#D4B87A]/30">
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#8B6914] mb-1">Invoice Summary</p>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[#5A4030]">Total: <span className="font-mono font-semibold">{php(amount)}</span></p>
              <p className="text-[11px] text-[#5A4030]">Balance due: <span className="font-mono font-semibold text-[#C0392B]">{php(amount - form.depositPaid)}</span></p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Quote Modal ──────────────────────────────────────────────────────────────

function QuoteModal({
  open, onClose, quote, projects, onSave,
}: {
  open: boolean;
  onClose: () => void;
  quote?: Quote;
  projects: Project[];
  onSave: (q: Quote) => void;
}) {
  const isEdit = !!quote;
  const [form, setForm] = useState({
    projectId: quote?.projectId ?? "",
    clientName: quote?.clientName ?? "",
    issueDate: quote?.issueDate ?? new Date().toISOString().slice(0, 10),
    expiryDate: quote?.expiryDate ?? "",
    status: quote?.status ?? "Draft" as QuoteStatus,
    depositRequired: quote?.depositRequired ?? 0,
    notes: quote?.notes ?? "",
  });
  const [desc, setDesc] = useState(quote?.lineItems[0]?.description ?? "");
  const [amount, setAmount] = useState(quote?.lineItems[0]?.amount ?? 0);
  const { toast } = useToast();

  const handleProjectChange = (pid: string) => {
    const proj = projects.find(p => p.id === pid);
    setForm(f => ({ ...f, projectId: pid, clientName: proj?.client ?? "" }));
    if (proj) {
      setDesc(proj.name);
      setAmount(proj.price);
      setForm(f => ({ ...f, depositRequired: Math.round(proj.price * 0.5), projectId: pid, clientName: proj.client }));
    }
  };

  const handleSave = () => {
    if (!form.projectId || !form.expiryDate || !desc || amount <= 0) {
      toast.error("Please fill all required fields");
      return;
    }
    onSave({ id: quote?.id ?? "", ...form, lineItems: [{ description: desc, amount }] });
    onClose();
    toast.success(isEdit ? "Quote updated" : "Quote created", form.clientName);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Quote" : "New Quote"}
      subtitle="Send a formal price estimate before a commission begins"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={handleSave}>{isEdit ? "Save Changes" : "Create Quote"}</Btn></>}
    >
      <div className="space-y-4">
        <Field label="Project" required>
          <Select value={form.projectId} onChange={e => handleProjectChange(e.target.value)}>
            <option value="">Select project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <FormRow>
          <Field label="Issue Date" required>
            <Input type="date" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} />
          </Field>
          <Field label="Expiry Date" required>
            <Input type="date" value={form.expiryDate} onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
          </Field>
        </FormRow>
        <Field label="Description" required>
          <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Piece name and specifications…" />
        </Field>
        <FormRow>
          <Field label="Quoted Amount (₱)" required>
            <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} min={0} />
          </Field>
          <Field label="Deposit Required (₱)">
            <Input type="number" value={form.depositRequired} onChange={e => setForm(f => ({ ...f, depositRequired: Number(e.target.value) }))} min={0} />
          </Field>
        </FormRow>
        <Field label="Status">
          <Select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as QuoteStatus }))}>
            {(["Draft", "Sent", "Accepted", "Declined", "Expired"] as QuoteStatus[]).map(s =>
              <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Terms, validity period, special conditions…" rows={2} />
        </Field>
        {amount > 0 && (
          <div className="p-3 rounded border bg-[#F5F0E8] border-[#D4B87A]/30">
            <p className="text-[9px] tracking-[0.15em] uppercase text-[#8B6914] mb-1">Quote Summary</p>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[#5A4030]">Total: <span className="font-mono font-semibold">{php(amount)}</span></p>
              <p className="text-[11px] text-[#5A4030]">Deposit: <span className="font-mono font-semibold">{php(form.depositRequired)}</span> ({amount > 0 ? Math.round((form.depositRequired / amount) * 100) : 0}%)</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Expense Modal ────────────────────────────────────────────────────────────

function ExpenseModal({
  open, onClose, expense, onSave,
}: {
  open: boolean;
  onClose: () => void;
  expense?: Expense;
  onSave: (e: Expense) => void;
}) {
  const isEdit = !!expense;
  const [form, setForm] = useState<Omit<Expense, "id">>({
    date: expense?.date ?? new Date().toISOString().slice(0, 10),
    description: expense?.description ?? "",
    category: expense?.category ?? "Materials",
    amount: expense?.amount ?? 0,
    supplier: expense?.supplier ?? "",
    notes: expense?.notes ?? "",
  });
  const { toast } = useToast();

  const handleSave = () => {
    if (!form.description || form.amount <= 0) {
      toast.error("Please fill all required fields");
      return;
    }
    onSave({ id: expense?.id ?? "", ...form });
    onClose();
    toast.success(isEdit ? "Expense updated" : "Expense recorded", form.description);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Expense" : "Log Expense"}
      subtitle="Record a business cost or supplier payment"
      footer={<><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={handleSave}>{isEdit ? "Save Changes" : "Log Expense"}</Btn></>}
    >
      <div className="space-y-4">
        <FormRow>
          <Field label="Date" required>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </Field>
          <Field label="Category" required>
            <Select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))}>
              {EXP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </FormRow>
        <Field label="Description" required>
          <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What was purchased or paid for…" />
        </Field>
        <FormRow>
          <Field label="Amount (₱)" required>
            <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} min={0} />
          </Field>
          <Field label="Supplier">
            <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name…" />
          </Field>
        </FormRow>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional details…" rows={2} />
        </Field>
      </div>
    </Modal>
  );
}

// ─── Main Accounting Page ─────────────────────────────────────────────────────

interface AccountingPageProps {
  projects: Project[];
  clients: Client[];
}

type AccountingTab = "overview" | "invoices" | "quotes" | "expenses";

export function AccountingPage({ projects, clients }: AccountingPageProps) {
  const [tab, setTab] = useState<AccountingTab>("overview");
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);
  const [quotes, setQuotes]     = useState<Quote[]>(INITIAL_QUOTES);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);

  // Modals
  const [invModal, setInvModal]       = useState<{ open: boolean; invoice?: Invoice }>({ open: false });
  const [quoteModal, setQuoteModal]   = useState<{ open: boolean; quote?: Quote }>({ open: false });
  const [expModal, setExpModal]       = useState<{ open: boolean; expense?: Expense }>({ open: false });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; onConfirm: () => void; label: string }>({ open: false, onConfirm: () => {}, label: "" });

  const { toast } = useToast();

  // ── Computed Metrics ──────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const collected    = invoices.filter(i => i.status === "Paid").reduce((s, i) => s + invoiceTotal(i), 0);
    const outstanding  = invoices.filter(i => i.status === "Sent" || i.status === "Overdue").reduce((s, i) => s + (invoiceTotal(i) - i.depositPaid), 0);
    const overdue      = invoices.filter(i => i.status === "Overdue").length;
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netProfit    = collected - totalExpenses;
    const pipeline     = projects.filter(p => p.stage !== "Paid").reduce((s, p) => s + p.price, 0);
    return { collected, outstanding, overdue, totalExpenses, netProfit, pipeline };
  }, [invoices, expenses, projects]);

  // ── CRUD Handlers ─────────────────────────────────────────────────────────

  const saveInvoice = (inv: Invoice) => {
    if (inv.id) {
      setInvoices(prev => prev.map(i => i.id === inv.id ? inv : i));
    } else {
      setInvoices(prev => [...prev, { ...inv, id: generateId("INV-", prev.map(i => ({ id: i.id.replace("INV-", "I") }))) }]);
    }
  };

  const deleteInvoice = (id: string) => {
    setDeleteModal({
      open: true,
      label: `Invoice ${id}`,
      onConfirm: () => { setInvoices(prev => prev.filter(i => i.id !== id)); toast.success("Invoice deleted"); },
    });
  };

  const saveQuote = (q: Quote) => {
    if (q.id) {
      setQuotes(prev => prev.map(x => x.id === q.id ? q : x));
    } else {
      setQuotes(prev => [...prev, { ...q, id: `QUO-${String(prev.length + 1).padStart(3, "0")}` }]);
    }
  };

  const deleteQuote = (id: string) => {
    setDeleteModal({
      open: true,
      label: `Quote ${id}`,
      onConfirm: () => { setQuotes(prev => prev.filter(q => q.id !== id)); toast.success("Quote deleted"); },
    });
  };

  const saveExpense = (e: Expense) => {
    if (e.id) {
      setExpenses(prev => prev.map(x => x.id === e.id ? e : x));
    } else {
      setExpenses(prev => [...prev, { ...e, id: `EXP-${String(prev.length + 1).padStart(3, "0")}` }]);
    }
  };

  const deleteExpense = (id: string) => {
    setDeleteModal({
      open: true,
      label: "this expense",
      onConfirm: () => { setExpenses(prev => prev.filter(e => e.id !== id)); toast.success("Expense deleted"); },
    });
  };

  // ── Expense breakdown by category ─────────────────────────────────────────
  const expByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] ?? 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const TABS: { id: AccountingTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview",  label: "Overview",  icon: <TrendingUp size={12} /> },
    { id: "invoices",  label: "Invoices",  icon: <Receipt size={12} /> },
    { id: "quotes",    label: "Quotes",    icon: <FileText size={12} /> },
    { id: "expenses",  label: "Expenses",  icon: <DollarSign size={12} /> },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Modals */}
      <InvoiceModal
        open={invModal.open}
        onClose={() => setInvModal({ open: false })}
        invoice={invModal.invoice}
        projects={projects}
        onSave={saveInvoice}
      />
      <QuoteModal
        open={quoteModal.open}
        onClose={() => setQuoteModal({ open: false })}
        quote={quoteModal.quote}
        projects={projects}
        onSave={saveQuote}
      />
      <ExpenseModal
        open={expModal.open}
        onClose={() => setExpModal({ open: false })}
        expense={expModal.expense}
        onSave={saveExpense}
      />
      <ConfirmDialog
        open={deleteModal.open}
        onClose={() => setDeleteModal(d => ({ ...d, open: false }))}
        onConfirm={deleteModal.onConfirm}
        title="Confirm Delete"
        message={`Are you sure you want to delete ${deleteModal.label}? This cannot be undone.`}
        confirmLabel="Delete"
        danger
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard gold accent label="Revenue Collected" value={php(metrics.collected)} sub="Fully paid invoices" trend="up" />
        <StatCard label="Outstanding Balance" value={php(metrics.outstanding)} sub={`${metrics.overdue} overdue invoice${metrics.overdue !== 1 ? "s" : ""}`} trend={metrics.overdue > 0 ? "down" : "neutral"} />
        <StatCard label="Total Expenses" value={php(metrics.totalExpenses)} sub="Materials, tools & overhead" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Net Profit (June)" value={php(metrics.netProfit)} sub="Collected minus expenses" trend={metrics.netProfit > 0 ? "up" : "down"} />
        <StatCard label="Pipeline Revenue" value={php(metrics.pipeline)} sub="Active projects, not yet invoiced" trend="up" />
        <StatCard label="Pending Quotes" value={String(quotes.filter(q => q.status === "Sent").length)} sub={`${quotes.filter(q => q.status === "Accepted").length} accepted this month`} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 p-0.5 rounded border border-border bg-muted/30 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            id={`accounting-tab-${t.id}`}
            className="flex items-center gap-1.5 px-4 py-1.5 text-[9px] tracking-[0.15em] uppercase rounded transition-all"
            style={{
              background: tab === t.id ? "var(--card)" : "transparent",
              color: tab === t.id ? "var(--foreground)" : "var(--muted-foreground)",
              boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
            }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            {/* Revenue chart */}
            <div className="bg-card border border-border rounded p-5">
              <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-5">Revenue vs. Expenses — 2026</p>
              <ResponsiveContainer width="100%" height={190}>
                <AreaChart data={REVENUE_DATA}>
                  <defs>
                    <linearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B8975A" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#B8975A" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C0392B" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#C0392B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#7A6F5E" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#7A6F5E" }} axisLine={false} tickLine={false} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => php(v)} />
                  <Area type="monotone" dataKey="collected" stroke="#B8975A" strokeWidth={1.5} fill="url(#gradCollected)" name="Collected" />
                  <Area type="monotone" dataKey="expenses" stroke="#C0392B" strokeWidth={1.5} fill="url(#gradExpenses)" name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-5 mt-2">
                {[{ label: "Collected", color: "#B8975A" }, { label: "Expenses", color: "#C0392B" }].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-5 h-px inline-block" style={{ background: color }} />
                    <span className="text-[9px] text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expense breakdown */}
            <div className="bg-card border border-border rounded p-5">
              <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-5">Expense Breakdown — June</p>
              <div className="space-y-2.5">
                {expByCategory.map(({ name, value }) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground w-28 flex-shrink-0 truncate">{name}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#B8975A]"
                        style={{ width: `${(value / metrics.totalExpenses) * 100}%`, opacity: 0.6 + (value / metrics.totalExpenses) * 0.4 }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-foreground w-20 text-right flex-shrink-0">{php(value)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Total Expenses</p>
                <p className="text-sm font-mono font-light text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{php(metrics.totalExpenses)}</p>
              </div>
            </div>
          </div>

          {/* Recent invoices summary */}
          <div className="bg-card border border-border rounded overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground">Recent Invoices</p>
              <button onClick={() => setTab("invoices")} className="text-[9px] text-accent hover:opacity-80 transition-opacity">View all →</button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Invoice", "Client", "Total", "Balance Due", "Status"].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-[9px] tracking-[0.15em] uppercase text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.slice(0, 4).map(inv => {
                  const total = invoiceTotal(inv);
                  const balance = total - inv.depositPaid;
                  const s = STATUS_INV[inv.status];
                  return (
                    <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-[11px] font-medium text-foreground">{inv.id}</p>
                        <p className="text-[9px] text-muted-foreground font-mono mt-0.5">{fmtDate(inv.issueDate)}</p>
                      </td>
                      <td className="px-5 py-3 text-[11px] text-muted-foreground">{inv.clientName}</td>
                      <td className="px-5 py-3 text-[11px] font-mono text-foreground">{php(total)}</td>
                      <td className="px-5 py-3 text-[11px] font-mono" style={{ color: balance > 0 && inv.status === "Overdue" ? "#C0392B" : "var(--foreground)" }}>{php(balance)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-medium rounded ${s.bg}`}>
                          {s.icon}{s.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── INVOICES TAB ──────────────────────────────────────────────────── */}
      {tab === "invoices" && (
        <div className="space-y-4">
          <SectionHeader
            title="Invoices"
            sub={`${invoices.filter(i => i.status === "Paid").length} paid · ${invoices.filter(i => i.status === "Overdue").length} overdue`}
            action={
              <button
                id="new-invoice-btn"
                onClick={() => setInvModal({ open: true })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-opacity hover:opacity-85"
                style={{ background: "#17140F", color: "#FAF7F0" }}
              >
                <Plus size={11} /> New Invoice
              </button>
            }
          />

          {invoices.filter(i => i.status === "Overdue").length > 0 && (
            <div className="flex items-center gap-2.5 p-3 rounded border bg-red-50 border-red-100">
              <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
              <p className="text-[11px] text-red-700">
                {invoices.filter(i => i.status === "Overdue").length} overdue invoice{invoices.filter(i => i.status === "Overdue").length > 1 ? "s" : ""} — follow up required.
              </p>
            </div>
          )}

          <div className="bg-card border border-border rounded overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border" style={{ background: "rgba(0,0,0,0.02)" }}>
                  {["Invoice #", "Client", "Issued", "Due", "Total", "Deposit Paid", "Balance Due", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[8px] tracking-[0.2em] uppercase text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const total = invoiceTotal(inv);
                  const balance = total - inv.depositPaid;
                  const s = STATUS_INV[inv.status];
                  return (
                    <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="text-[11px] font-mono font-medium text-foreground">{inv.id}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5 truncate max-w-[120px]">{inv.lineItems[0]?.description}</p>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground">{inv.clientName}</td>
                      <td className="px-4 py-3 text-[10px] font-mono text-muted-foreground">{fmtDate(inv.issueDate)}</td>
                      <td className="px-4 py-3 text-[10px] font-mono text-muted-foreground">{fmtDate(inv.dueDate)}</td>
                      <td className="px-4 py-3 text-[11px] font-mono text-foreground">{php(total)}</td>
                      <td className="px-4 py-3 text-[11px] font-mono text-emerald-700">{php(inv.depositPaid)}</td>
                      <td className="px-4 py-3 text-[11px] font-mono"
                        style={{ color: inv.status === "Overdue" ? "#C0392B" : inv.status === "Paid" ? "#10b981" : "var(--foreground)" }}>
                        {inv.status === "Paid" ? "—" : php(balance)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-medium rounded ${s.bg}`}>
                          {s.icon}{s.text}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setInvModal({ open: true, invoice: inv })}
                            className="text-[9px] text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-muted/40 transition-colors">
                            Edit
                          </button>
                          <button onClick={() => deleteInvoice(inv.id)}
                            className="text-[9px] text-red-400 hover:text-red-600 px-1.5 py-1 rounded hover:bg-red-50 transition-colors">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── QUOTES TAB ────────────────────────────────────────────────────── */}
      {tab === "quotes" && (
        <div className="space-y-4">
          <SectionHeader
            title="Quotes"
            sub="Send formal price estimates before commissions begin"
            action={
              <button
                id="new-quote-btn"
                onClick={() => setQuoteModal({ open: true })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-opacity hover:opacity-85"
                style={{ background: "#17140F", color: "#FAF7F0" }}
              >
                <Plus size={11} /> New Quote
              </button>
            }
          />

          <div className="grid grid-cols-3 gap-3">
            {(["Draft", "Sent", "Accepted"] as QuoteStatus[]).map(s => {
              const count = quotes.filter(q => q.status === s).length;
              const total = quotes.filter(q => q.status === s).reduce((sum, q) => sum + quoteTotal(q), 0);
              const st = STATUS_QUO[s];
              return (
                <div key={s} className="bg-card border border-border rounded p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-medium ${st.bg}`}>{st.text}</span>
                    <span className="text-[11px] font-mono text-muted-foreground">{count}</span>
                  </div>
                  <p className="text-lg font-light text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{php(total)}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">total quoted value</p>
                </div>
              );
            })}
          </div>

          <div className="bg-card border border-border rounded overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border" style={{ background: "rgba(0,0,0,0.02)" }}>
                  {["Quote #", "Client", "Description", "Issued", "Expires", "Total", "Deposit", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[8px] tracking-[0.2em] uppercase text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quotes.map(q => {
                  const total = quoteTotal(q);
                  const st = STATUS_QUO[q.status];
                  return (
                    <tr key={q.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors group">
                      <td className="px-4 py-3 text-[11px] font-mono font-medium text-foreground">{q.id}</td>
                      <td className="px-4 py-3 text-[11px] text-muted-foreground">{q.clientName}</td>
                      <td className="px-4 py-3 text-[11px] text-foreground max-w-[160px]">
                        <p className="truncate">{q.lineItems[0]?.description}</p>
                      </td>
                      <td className="px-4 py-3 text-[10px] font-mono text-muted-foreground">{fmtDate(q.issueDate)}</td>
                      <td className="px-4 py-3 text-[10px] font-mono text-muted-foreground">{fmtDate(q.expiryDate)}</td>
                      <td className="px-4 py-3 text-[11px] font-mono text-foreground">{php(total)}</td>
                      <td className="px-4 py-3 text-[11px] font-mono text-muted-foreground">{php(q.depositRequired)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] px-2 py-0.5 rounded font-medium ${st.bg}`}>{st.text}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setQuoteModal({ open: true, quote: q })}
                            className="text-[9px] text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-muted/40 transition-colors">
                            Edit
                          </button>
                          <button onClick={() => deleteQuote(q.id)}
                            className="text-[9px] text-red-400 hover:text-red-600 px-1.5 py-1 rounded hover:bg-red-50 transition-colors">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── EXPENSES TAB ──────────────────────────────────────────────────── */}
      {tab === "expenses" && (
        <div className="space-y-4">
          <SectionHeader
            title="Expenses"
            sub={`${expenses.length} records · ${php(metrics.totalExpenses)} total`}
            action={
              <button
                id="new-expense-btn"
                onClick={() => setExpModal({ open: true })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded transition-opacity hover:opacity-85"
                style={{ background: "#17140F", color: "#FAF7F0" }}
              >
                <Plus size={11} /> Log Expense
              </button>
            }
          />

          <div className="bg-card border border-border rounded overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border" style={{ background: "rgba(0,0,0,0.02)" }}>
                  {["Date", "Description", "Category", "Supplier", "Amount", ""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[8px] tracking-[0.2em] uppercase text-muted-foreground font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.sort((a, b) => b.date.localeCompare(a.date)).map(exp => (
                  <tr key={exp.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-3 text-[10px] font-mono text-muted-foreground">{fmtDate(exp.date)}</td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] font-medium text-foreground">{exp.description}</p>
                      {exp.notes && <p className="text-[9px] text-muted-foreground mt-0.5">{exp.notes}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[9px] px-2 py-0.5 rounded font-medium bg-[#F5F2EC] text-[#6B5A3A]">{exp.category}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground">{exp.supplier || "—"}</td>
                    <td className="px-4 py-3 text-[11px] font-mono font-medium text-foreground">{php(exp.amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setExpModal({ open: true, expense: exp })}
                          className="text-[9px] text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-muted/40 transition-colors">
                          Edit
                        </button>
                        <button onClick={() => deleteExpense(exp.id)}
                          className="text-[9px] text-red-400 hover:text-red-600 px-1.5 py-1 rounded hover:bg-red-50 transition-colors">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-muted/10">
              <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground">Total Expenses</p>
              <p className="text-sm font-mono text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{php(metrics.totalExpenses)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
