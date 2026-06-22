import { Pencil, Trash2 } from "lucide-react";
import type { Expense, Invoice, Quote } from "../accountingData";
import { fmtDate, php } from "../data";

const invoiceTotal = (invoice: Invoice) => invoice.lineItems.reduce((sum, line) => sum + line.amount, 0);
const quoteTotal = (quote: Quote) => quote.lineItems.reduce((sum, line) => sum + line.amount, 0);

const INVOICE_STATUS: Record<Invoice["status"], string> = {
  Draft: "bg-stone-100 text-stone-600",
  Sent: "bg-sky-50 text-sky-700",
  Paid: "bg-emerald-50 text-emerald-700",
  Overdue: "bg-red-50 text-red-700",
  Cancelled: "bg-stone-100 text-stone-500",
};

const QUOTE_STATUS: Record<Quote["status"], string> = {
  Draft: "bg-stone-100 text-stone-600",
  Sent: "bg-sky-50 text-sky-700",
  Accepted: "bg-emerald-50 text-emerald-700",
  Declined: "bg-red-50 text-red-700",
  Expired: "bg-amber-50 text-amber-700",
};

interface InvoiceCardsProps {
  invoices: Invoice[];
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (id: string) => void;
}

export function InvoiceCards({ invoices, onEdit, onDelete }: InvoiceCardsProps) {
  return (
    <div className="space-y-2 md:hidden">
      {invoices.map((invoice) => {
        const total = invoiceTotal(invoice);
        const balance = Math.max(0, total - invoice.depositPaid);
        return (
          <article key={invoice.id} className="border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="font-mono text-[11px] font-medium">{invoice.id}</p><p className="mt-1 text-[11px] text-muted-foreground">{invoice.clientName}</p></div>
              <span className={`px-2 py-1 text-[9px] font-medium ${INVOICE_STATUS[invoice.status]}`}>{invoice.status}</span>
            </div>
            <p className="mt-3 truncate text-[10px] text-muted-foreground">{invoice.lineItems[0]?.description}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-[10px]">
              <div><dt className="text-muted-foreground">Total</dt><dd className="mt-1 font-mono">{php(total)}</dd></div>
              <div><dt className="text-muted-foreground">Balance due</dt><dd className="mt-1 font-mono">{php(balance)}</dd></div>
              <div><dt className="text-muted-foreground">Issued</dt><dd className="mt-1">{fmtDate(invoice.issueDate)}</dd></div>
              <div><dt className="text-muted-foreground">Due</dt><dd className="mt-1">{fmtDate(invoice.dueDate)}</dd></div>
            </dl>
            {(onEdit || onDelete) && <CardActions onEdit={() => onEdit?.(invoice)} onDelete={() => onDelete?.(invoice.id)} />}
          </article>
        );
      })}
    </div>
  );
}

export function QuoteCards({ quotes, onEdit, onDelete }: { quotes: Quote[]; onEdit: (quote: Quote) => void; onDelete: (id: string) => void }) {
  return (
    <div className="space-y-2 md:hidden">
      {quotes.map((quote) => (
        <article key={quote.id} className="border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[11px] font-medium">{quote.id}</p><p className="mt-1 text-[11px] text-muted-foreground">{quote.clientName}</p></div><span className={`px-2 py-1 text-[9px] ${QUOTE_STATUS[quote.status]}`}>{quote.status}</span></div>
          <p className="mt-3 text-[10px] text-muted-foreground">{quote.lineItems[0]?.description}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-[10px]"><div><dt className="text-muted-foreground">Quoted</dt><dd className="mt-1 font-mono">{php(quoteTotal(quote))}</dd></div><div><dt className="text-muted-foreground">Deposit</dt><dd className="mt-1 font-mono">{php(quote.depositRequired)}</dd></div><div><dt className="text-muted-foreground">Issued</dt><dd className="mt-1">{fmtDate(quote.issueDate)}</dd></div><div><dt className="text-muted-foreground">Expires</dt><dd className="mt-1">{fmtDate(quote.expiryDate)}</dd></div></dl>
          <CardActions onEdit={() => onEdit(quote)} onDelete={() => onDelete(quote.id)} />
        </article>
      ))}
    </div>
  );
}

export function ExpenseCards({ expenses, onEdit, onDelete }: { expenses: Expense[]; onEdit: (expense: Expense) => void; onDelete: (id: string) => void }) {
  return (
    <div className="space-y-2 md:hidden">
      {expenses.map((expense) => (
        <article key={expense.id} className="border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-medium">{expense.description}</p><p className="mt-1 text-[9px] text-muted-foreground">{fmtDate(expense.date)} · {expense.category}</p></div><p className="font-mono text-[11px] font-medium">{php(expense.amount)}</p></div>
          <p className="mt-3 text-[10px] text-muted-foreground">{expense.supplier || "No supplier"}{expense.notes ? ` · ${expense.notes}` : ""}</p>
          <CardActions onEdit={() => onEdit(expense)} onDelete={() => onDelete(expense.id)} />
        </article>
      ))}
    </div>
  );
}

function CardActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3"><button type="button" onClick={onEdit} className="min-h-11 border border-border text-[10px] text-foreground"><Pencil className="mr-2 inline" size={12} />Edit</button><button type="button" onClick={onDelete} className="min-h-11 border border-red-100 text-[10px] text-red-700"><Trash2 className="mr-2 inline" size={12} />Delete</button></div>;
}
