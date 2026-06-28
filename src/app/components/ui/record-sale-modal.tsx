import { useState, type FormEvent } from "react";
import { DollarSign, PackageCheck, ShoppingBag, X } from "lucide-react";
import { apiRequest } from "../../api";
import type { EventStockSuggestion } from "../../events";
import { Combobox, type ComboboxOption } from "./combobox";
import { Btn, Field, Modal } from "../Modal";

type SaleLine = {
  lotId: string;
  description: string;
  code: string;
  unit: string;
  priceCents: number;
  quantity: string;
};

const php = (cents: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(cents / 100);

interface RecordSaleModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  suggestions: EventStockSuggestion[];
  onSold: () => void;
}

export function RecordSaleModal({ open, onClose, eventId, suggestions, onSold }: RecordSaleModalProps) {
  const [step, setStep] = useState<"select" | "review">("select");
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [clientId, setClientId] = useState("");
  const [clientOptions, setClientOptions] = useState<ComboboxOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  // Pre-filter suggestions to those with a retail price
  const pricedSuggestions = suggestions.filter((s) => (s.retailPriceCents ?? 0) > 0);

  const totalCents = lines.reduce((sum, line) => sum + line.priceCents * Number(line.quantity || 1), 0);

  function addLine(suggestion: EventStockSuggestion) {
    if (lines.some((l) => l.lotId === suggestion.id)) return;
    setLines([
      ...lines,
      {
        lotId: suggestion.id,
        description: suggestion.description,
        code: suggestion.code,
        unit: suggestion.unit,
        priceCents: suggestion.retailPriceCents ?? 0,
        quantity: "1",
      },
    ]);
  }

  function removeLine(lotId: string) {
    setLines(lines.filter((l) => l.lotId !== lotId));
  }

  async function loadClients() {
    if (clientsLoaded) return;
    setClientsLoading(true);
    try {
      const result = await apiRequest<{ data: Array<{ id: string; displayName: string }> }>("/api/clients?limit=100");
      setClientOptions(
        (result.data || []).map((c) => ({ value: c.id, label: c.displayName })),
      );
      setClientsLoaded(true);
    } catch {
      // ignore
    } finally {
      setClientsLoading(false);
    }
  }

  // Eager-load clients when modal opens
  if (open && !clientsLoaded && !clientsLoading) {
    void loadClients();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (lines.length === 0) return;
    setSaving(true);
    setError(null);

    try {
      // 1. Create invoice with eventId
      const lineItemsSnapshot = lines.map((line) => ({
        lotId: line.lotId,
        description: line.description,
        code: line.code,
        unit: line.unit,
        priceCents: line.priceCents,
        quantity: Number(line.quantity || 1),
        extendedCents: line.priceCents * Number(line.quantity || 1),
      }));

      const invoicePayload: Record<string, unknown> = {
        clientId: clientId || undefined,
        eventId,
        subtotalCents: totalCents,
        discountCents: 0,
        taxCents: 0,
        totalCents,
        lineItemsSnapshot,
        dueDate: new Date().toISOString(),
      };

      const invoiceResult = await apiRequest<{ data: { id: string } }>("/api/invoices", {
        method: "POST",
        body: JSON.stringify(invoicePayload),
      });
      const invoiceId = invoiceResult.data.id;

      // 2. Create stock-out movements (sale type) for each piece
      await Promise.all(
        lines.map((line) =>
          apiRequest("/api/inventory/movements", {
            method: "POST",
            body: JSON.stringify({
              inventoryLotId: line.lotId,
              type: "sale",
              quantity: line.quantity,
              eventId,
              reason: `Event sale — ${line.description}`,
            }),
          }),
        ),
      );

      // 3. Record payment (full amount)
      await apiRequest("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          invoiceId,
          amountCents: totalCents,
          method: paymentMethod,
          receivedAt: new Date().toISOString(),
          notes: "Event sale — recorded at point of sale",
        }),
      });

      onSold();
      reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sale could not be recorded.");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStep("select");
    setLines([]);
    setClientId("");
    setError(null);
    onClose();
  }

  if (!open) return null;

  return (
    <Modal open={open} onClose={reset} title="Record event sale" subtitle="Sell finished pieces directly at the event." width={580}>
      {step === "select" ? (
        <div className="space-y-4">
          {pricedSuggestions.length === 0 ? (
            <div className="border border-dashed border-border py-10 text-center">
              <PackageCheck className="mx-auto text-muted-foreground" size={20} />
              <p className="mt-2 text-[12px] text-muted-foreground">
                No finished pieces with retail prices are available. Add catalog pieces with retail prices to your inventory first.
              </p>
            </div>
          ) : (
            <>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Available finished pieces ({pricedSuggestions.length})
              </p>
              <div className="max-h-64 space-y-0.5 overflow-y-auto">
                {pricedSuggestions.map((item) => {
                  const selected = lines.some((l) => l.lotId === item.id);
                  return (
                    <div
                      key={item.id}
                      className={`flex min-h-12 items-center gap-3 border px-3 ${
                        selected ? "border-[#B8975A] bg-[#F4EFE6]" : "border-border"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium">{item.description}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.code} · {item.availableQuantity} {item.unit} available · {php(item.retailPriceCents ?? 0)} each
                        </p>
                      </div>
                      {selected ? (
                        <button
                          onClick={() => removeLine(item.id)}
                          className="flex min-h-8 items-center gap-1 px-2 text-[11px] text-red-600"
                        >
                          <X size={12} />
                          Remove
                        </button>
                      ) : (
                        <button
                          onClick={() => addLine(item)}
                          className="flex min-h-8 items-center gap-1 px-2 text-[11px] uppercase tracking-wider text-accent"
                        >
                          <ShoppingBag size={12} />
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {lines.length > 0 && (
                <button
                  onClick={() => setStep("review")}
                  className="flex min-h-11 w-full items-center justify-center gap-2 bg-foreground text-[12px] font-medium text-background"
                >
                  Review sale · {lines.length} piece{lines.length !== 1 ? "s" : ""} · {php(totalCents)}
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <p role="alert" className="border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
              {error}
            </p>
          ) : null}

          {/* Sale lines summary */}
          <div className="border border-border">
            <div className="border-b border-border px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Sale items</p>
            </div>
            {lines.map((line) => (
              <div
                key={line.lotId}
                className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0"
              >
                <div>
                  <p className="text-[12px] font-medium">{line.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {line.code} · {php(line.priceCents)} × {line.quantity}
                  </p>
                </div>
                <p className="font-mono text-[12px]">{php(line.priceCents * Number(line.quantity || 1))}</p>
              </div>
            ))}
            <div className="flex items-center justify-between bg-muted/30 px-4 py-3">
              <span className="text-[12px] font-medium">Total</span>
              <span className="font-mono text-[13px] font-medium">{php(totalCents)}</span>
            </div>
          </div>

          {/* Client picker */}
          <Field label="Client (optional — leave empty for walk-in)">
            <Combobox
              options={clientOptions}
              value={clientId}
              onValueChange={setClientId}
              placeholder={clientsLoading ? "Loading clients…" : "Walk-in sale (no client)"}
              searchPlaceholder="Search clients…"
              aria-label="Client"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Walk-in sales are attributed to the event without a client record.
            </p>
          </Field>

          {/* Payment method */}
          <Field label="Payment method">
            <Combobox
              options={[
                { value: "cash", label: "Cash" },
                { value: "gcash", label: "GCash" },
                { value: "maya", label: "Maya" },
                { value: "bank_transfer", label: "Bank Transfer" },
                { value: "card", label: "Card" },
                { value: "other", label: "Other" },
              ]}
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              aria-label="Payment method"
            />
          </Field>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Btn variant="secondary" onClick={() => setStep("select")}>
              Back
            </Btn>
            <Btn type="submit" disabled={saving}>
              {saving ? "Recording…" : `Record sale · ${php(totalCents)}`}
            </Btn>
          </div>
        </form>
      )}
    </Modal>
  );
}
