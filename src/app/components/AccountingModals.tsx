import { useEffect, useState } from "react";
import { php } from "../data";
import type { Project } from "../data";
import type { Expense, ExpenseCategory, Invoice, InvoiceStatus, Quote, QuoteStatus } from "../accountingData";
import { Btn, Field, FormRow, Input, Modal, Select, Textarea } from "./Modal";
import { useToast } from "./Toast";

const EXP_CATS: ExpenseCategory[] = ["Materials", "Tools & Equipment", "Packaging", "Marketing", "Utilities", "Other"];

// ─── Invoice Modal ────────────────────────────────────────────────────────────

export function InvoiceModal({
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
      title={isEdit ? "Edit Invoice" : "Create invoice"}
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

export function QuoteModal({
  open, onClose, quote, projects, onSave,
}: {
  open: boolean;
  onClose: () => void;
  quote?: Quote;
  projects: Project[];
  onSave: (q: Quote) => void;
}) {
  const isEdit = !!quote?.id;
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

  useEffect(() => {
    if (!open) return;
    setForm({
      projectId: quote?.projectId ?? "",
      clientName: quote?.clientName ?? "",
      issueDate: quote?.issueDate ?? new Date().toISOString().slice(0, 10),
      expiryDate: quote?.expiryDate ?? "",
      status: quote?.status ?? "Draft",
      depositRequired: quote?.depositRequired ?? 0,
      notes: quote?.notes ?? "",
    });
    setDesc(quote?.lineItems[0]?.description ?? "");
    setAmount(quote?.lineItems[0]?.amount ?? 0);
  }, [open, quote]);

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
      title={isEdit ? "Edit Quote" : "Create quote"}
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

export function ExpenseModal({
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
