import { useEffect, useState } from "react";
import { php } from "../data";
import type { Project } from "../data";
import type { Expense, ExpenseCategory, Invoice, InvoiceStatus, Quote, QuoteStatus } from "../accountingTypes";
import { Btn, Field, FormRow, Input, Modal, Textarea } from "./Modal";
import { useToast } from "./Toast";
import { Combobox } from "./ui/combobox";

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
  const [form, setForm] = useState<Omit<Invoice, "id" | "lineItems" | "depositPaid">>({
    projectId: invoice?.projectId ?? "",
    clientName: invoice?.clientName ?? "",
    issueDate: invoice?.issueDate ?? new Date().toISOString().slice(0, 10),
    dueDate: invoice?.dueDate ?? "",
    status: invoice?.status ?? "Draft",
    notes: invoice?.notes ?? "",
  });
  const [desc, setDesc] = useState(invoice?.lineItems[0]?.description ?? "");
  const [amountRaw, setAmountRaw] = useState(invoice?.lineItems[0]?.amount ? String(invoice.lineItems[0].amount) : "");
  const [depositRaw, setDepositRaw] = useState(invoice?.depositPaid ? String(invoice.depositPaid) : "");
  const { toast } = useToast();

  const amount = parseFloat(amountRaw) || 0;
  const depositPaid = parseFloat(depositRaw) || 0;

  const handleProjectChange = (pid: string) => {
    const proj = projects.find(p => p.id === pid);
    setForm(f => ({ ...f, projectId: pid, clientName: proj?.client ?? "" }));
    if (proj) {
      setDesc(proj.name);
      setAmountRaw(String(proj.price));
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
      depositPaid,
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
      <div className="space-y-5">
        <Field label="Project" required>
          <Combobox
            options={[{ value: "", label: "Select project…" }, ...projects.map(p => ({ value: p.id, label: p.name }))]}
            value={form.projectId}
            onValueChange={handleProjectChange}
            placeholder="Select project…"
            searchPlaceholder="Search project…"
            aria-label="Project"
          />
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
            <Input type="text" inputMode="decimal" value={amountRaw} onChange={e => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setAmountRaw(v); }} placeholder="0.00" />
          </Field>
          <Field label="Deposit Paid (₱)">
            <Input type="text" inputMode="decimal" value={depositRaw} onChange={e => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setDepositRaw(v); }} placeholder="0.00" />
          </Field>
        </FormRow>
        <FormRow>
          <Field label="Status">
            <Combobox
              options={(["Draft", "Sent", "Paid", "Overdue", "Cancelled"] as InvoiceStatus[]).map(s => ({ value: s, label: s }))}
              value={form.status}
              onValueChange={(v) => setForm(f => ({ ...f, status: v as InvoiceStatus }))}
              placeholder="Select status…"
              searchPlaceholder="Search status…"
              aria-label="Invoice status"
            />
          </Field>
        </FormRow>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment terms, special instructions…" rows={2} />
        </Field>
        {amount > 0 && (
          <div className="p-3 rounded border bg-[#F5F0E8] border-[#D4B87A]/30">
            <p className="text-[11px] tracking-[0.15em] uppercase text-[#8B6914] mb-1">Invoice Summary</p>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[#5A4030]">Total: <span className="font-mono font-semibold">{php(amount)}</span></p>
              <p className="text-[11px] text-[#5A4030]">Balance due: <span className="font-mono font-semibold text-[#C0392B]">{php(amount - depositPaid)}</span></p>
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
  const [form, setForm] = useState<Omit<Quote, "id" | "lineItems" | "depositRequired">>({
    projectId: quote?.projectId ?? "",
    clientName: quote?.clientName ?? "",
    issueDate: quote?.issueDate ?? new Date().toISOString().slice(0, 10),
    expiryDate: quote?.expiryDate ?? "",
    status: quote?.status ?? "Draft" as QuoteStatus,
    notes: quote?.notes ?? "",
  });
  const [desc, setDesc] = useState(quote?.lineItems[0]?.description ?? "");
  const [amountRaw, setAmountRaw] = useState(quote?.lineItems[0]?.amount ? String(quote.lineItems[0].amount) : "");
  const [depositRaw, setDepositRaw] = useState(quote?.depositRequired ? String(quote.depositRequired) : "");
  const { toast } = useToast();

  const amount = parseFloat(amountRaw) || 0;
  const depositRequired = parseFloat(depositRaw) || 0;

  useEffect(() => {
    if (!open) return;
    setForm({
      projectId: quote?.projectId ?? "",
      clientName: quote?.clientName ?? "",
      issueDate: quote?.issueDate ?? new Date().toISOString().slice(0, 10),
      expiryDate: quote?.expiryDate ?? "",
      status: quote?.status ?? "Draft",
      notes: quote?.notes ?? "",
    });
    setDesc(quote?.lineItems[0]?.description ?? "");
    setAmountRaw(quote?.lineItems[0]?.amount ? String(quote.lineItems[0].amount) : "");
    setDepositRaw(quote?.depositRequired ? String(quote.depositRequired) : "");
  }, [open, quote]);

  const handleProjectChange = (pid: string) => {
    const proj = projects.find(p => p.id === pid);
    setForm(f => ({ ...f, projectId: pid, clientName: proj?.client ?? "" }));
    if (proj) {
      setDesc(proj.name);
      setAmountRaw(String(proj.price));
      const depo = Math.round(proj.price * 0.5);
      setDepositRaw(String(depo));
      setForm(f => ({ ...f, projectId: pid, clientName: proj.client }));
    }
  };

  const handleSave = () => {
    if (!form.projectId || !form.expiryDate || !desc || amount <= 0) {
      toast.error("Please fill all required fields");
      return;
    }
    onSave({ id: quote?.id ?? "", ...form, depositRequired, lineItems: [{ description: desc, amount }] });
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
      <div className="space-y-5">
        <Field label="Project" required>
          <Combobox
            options={[{ value: "", label: "Select project…" }, ...projects.map(p => ({ value: p.id, label: p.name }))]}
            value={form.projectId}
            onValueChange={handleProjectChange}
            placeholder="Select project…"
            searchPlaceholder="Search project…"
            aria-label="Project"
          />
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
            <Input type="text" inputMode="decimal" value={amountRaw} onChange={e => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setAmountRaw(v); }} placeholder="0.00" />
          </Field>
          <Field label="Deposit Required (₱)">
            <Input type="text" inputMode="decimal" value={depositRaw} onChange={e => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setDepositRaw(v); }} placeholder="0.00" />
          </Field>
        </FormRow>
        <Field label="Status">
          <Combobox
            options={(["Draft", "Sent", "Accepted", "Declined", "Expired"] as QuoteStatus[]).map(s => ({ value: s, label: s }))}
            value={form.status}
            onValueChange={(v) => setForm(f => ({ ...f, status: v as QuoteStatus }))}
            placeholder="Select status…"
            searchPlaceholder="Search status…"
            aria-label="Quote status"
          />
        </Field>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Terms, validity period, special conditions…" rows={2} />
        </Field>
        {amount > 0 && (
          <div className="p-3 rounded border bg-[#F5F0E8] border-[#D4B87A]/30">
            <p className="text-[11px] tracking-[0.15em] uppercase text-[#8B6914] mb-1">Quote Summary</p>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[#5A4030]">Total: <span className="font-mono font-semibold">{php(amount)}</span></p>
              <p className="text-[11px] text-[#5A4030]">Deposit: <span className="font-mono font-semibold">{php(depositRequired)}</span> ({amount > 0 ? Math.round((depositRequired / amount) * 100) : 0}%)</p>
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
  const [amountRaw, setAmountRaw] = useState(expense?.amount ? String(expense.amount) : "");
  const { toast } = useToast();

  const amount = parseFloat(amountRaw) || 0;

  const handleSave = () => {
    if (!form.description || amount <= 0) {
      toast.error("Please fill all required fields");
      return;
    }
    onSave({ id: expense?.id ?? "", ...form, amount });
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
      <div className="space-y-5">
        <FormRow>
          <Field label="Date" required>
            <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </Field>
          <Field label="Category" required>
            <Combobox
              options={EXP_CATS.map(c => ({ value: c, label: c }))}
              value={form.category}
              onValueChange={(v) => setForm(f => ({ ...f, category: v as ExpenseCategory }))}
              placeholder="Select category…"
              searchPlaceholder="Search category…"
              aria-label="Expense category"
            />
          </Field>
        </FormRow>
        <Field label="Description" required>
          <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What was purchased or paid for…" />
        </Field>
        <FormRow>
          <Field label="Amount (₱)" required>
            <Input type="text" inputMode="decimal" value={amountRaw} onChange={e => { const v = e.target.value; if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setAmountRaw(v); }} placeholder="0.00" />
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
