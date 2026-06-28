import { useEffect, useState, type FormEvent } from "react";
import { Plus, Edit3, ClipboardList, MapPin, Mail, Phone, Building } from "lucide-react";
import { apiRequest, ApiError } from "../api";
import { Btn, Field, FormRow, Input, Modal, Textarea } from "./Modal";
import { useToast } from "./Toast";

const USE_DATABASE = import.meta.env.VITE_DATA_MODE === "api";

interface ConsignmentRecord {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ConsignmentCount {
  id: string;
  countedAt: string;
  notes: string | null;
  items: ConsignmentCountItem[];
}

interface ConsignmentCountItem {
  id: string;
  inventoryLotId: string;
  countedQuantity: number;
  expectedQuantity: number | null;
  discrepancyNote: string | null;
}

const EMPTY_FORM = {
  name: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  address: "",
  notes: "",
};

const php = (cents: number | null | undefined) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(
    (cents ?? 0) / 100,
  );

export function ConsignmentPage() {
  const { toast } = useToast();
  const [records, setRecords] = useState<ConsignmentRecord[]>([]);
  const [loading, setLoading] = useState(USE_DATABASE);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ConsignmentRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ record: ConsignmentRecord; counts: ConsignmentCount[] } | null>(null);
  const [creatingCount, setCreatingCount] = useState(false);

  const loadRecords = async () => {
    if (!USE_DATABASE) return;
    setLoading(true);
    try {
      const res = await apiRequest<{ data: ConsignmentRecord[] }>("/consignment");
      setRecords(res.data);
      if (res.data[0] && !selectedId) setSelectedId(res.data[0].id);
    } catch (caught) {
      const msg = caught instanceof ApiError ? caught.message : "Could not load consignments.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id: string) => {
    if (!USE_DATABASE) return;
    try {
      const res = await apiRequest<{ data: { name: string; contactName: string | null; contactEmail: string | null; contactPhone: string | null; address: string | null; notes: string | null; isActive: boolean; createdAt: string; updatedAt: string; counts: ConsignmentCount[] } }>(`/consignment/${id}`);
      setDetail({
        record: { id, ...res.data },
        counts: res.data.counts,
      });
    } catch (caught) {
      const msg = caught instanceof ApiError ? caught.message : "Could not load detail.";
      toast.error(msg);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId]);

  const handleSave = async (values: typeof EMPTY_FORM & { id?: string }) => {
    setSaving(true);
    try {
      if (values.id) {
        await apiRequest(`/consignment/${values.id}`, {
          method: "PATCH",
          body: JSON.stringify(values),
        });
        toast.success("Consignment updated.");
      } else {
        await apiRequest("/consignment", {
          method: "POST",
          body: JSON.stringify(values),
        });
        toast.success("Consignment created.");
      }
      setCreating(false);
      setEditing(null);
      await loadRecords();
    } catch (caught) {
      const msg = caught instanceof ApiError ? caught.message : "Could not save.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCount = async (data: { countedAt: string; notes: string; items: Array<{ inventoryLotId: string; countedQuantity: number; expectedQuantity?: number; discrepancyNote?: string }> }) => {
    if (!selectedId) return;
    try {
      await apiRequest(`/consignment/${selectedId}/counts`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      toast.success("Count recorded.");
      setCreatingCount(false);
      await loadDetail(selectedId);
    } catch (caught) {
      const msg = caught instanceof ApiError ? caught.message : "Could not record count.";
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse bg-muted/40 rounded" />
        <div className="h-64 animate-pulse border border-border bg-card rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-xl tracking-tight text-foreground">Consignment</h1>
          <span className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground">Partner Shops</span>
        </div>
        <Btn onClick={() => setCreating(true)}>
          <Plus size={14} />
          Add Shop
        </Btn>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* List */}
        <div className="lg:col-span-1 space-y-2">
          {records.length === 0 ? (
            <div className="border border-border bg-card rounded p-8 text-center">
              <Building size={24} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-[13px] text-muted-foreground">No consignment partners yet.</p>
              <p className="text-[11px] text-muted-foreground mt-1">Add a partner shop that holds your stock for sale.</p>
            </div>
          ) : (
            records.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => setSelectedId(record.id)}
                className={`w-full text-left p-4 border rounded transition-colors ${
                  selectedId === record.id
                    ? "border-accent bg-accent/5"
                    : "border-border bg-card hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-foreground">{record.name}</p>
                  {!record.isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-muted-foreground/30 text-muted-foreground">Inactive</span>
                  )}
                </div>
                {record.contactName && (
                  <p className="text-[11px] text-muted-foreground mt-1">{record.contactName}</p>
                )}
                {record.address && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{record.address}</p>
                )}
              </button>
            ))
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {detail ? (
            <div className="space-y-5">
              {/* Partner info */}
              <section className="border border-border bg-card rounded p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-lg text-foreground">{detail.record.name}</h2>
                  <button
                    type="button"
                    onClick={() => setEditing(detail.record)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 text-[13px]">
                  {detail.record.contactName && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building size={12} /> {detail.record.contactName}
                    </div>
                  )}
                  {detail.record.contactEmail && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail size={12} /> {detail.record.contactEmail}
                    </div>
                  )}
                  {detail.record.contactPhone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone size={12} /> {detail.record.contactPhone}
                    </div>
                  )}
                  {detail.record.address && (
                    <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                      <MapPin size={12} /> {detail.record.address}
                    </div>
                  )}
                </div>
                {detail.record.notes && (
                  <p className="text-[12px] text-muted-foreground border-t border-border pt-3">{detail.record.notes}</p>
                )}
                {!detail.record.isActive && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">This consignment is inactive.</p>
                )}
              </section>

              {/* Counts */}
              <section className="border border-border bg-card rounded p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-sm text-foreground flex items-center gap-2">
                    <ClipboardList size={14} />
                    Consignment Counts
                  </h3>
                  <Btn onClick={() => setCreatingCount(true)}>
                    <Plus size={12} />
                    Record count
                  </Btn>
                </div>
                {detail.counts.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground py-4 text-center">No counts recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.counts.map((count) => (
                      <div key={count.id} className="border border-border rounded p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[12px] font-medium text-foreground">
                            {new Date(count.countedAt).toLocaleDateString("en-PH", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              timeZone: "Asia/Manila",
                            })}
                          </p>
                          <span className="text-[11px] text-muted-foreground">{count.items.length} items</span>
                        </div>
                        {count.notes && (
                          <p className="text-[11px] text-muted-foreground mt-1">{count.notes}</p>
                        )}
                        <div className="mt-2 space-y-1">
                          {count.items.map((item) => {
                            const discrepancy = item.expectedQuantity !== null && item.countedQuantity !== Number(item.expectedQuantity);
                            return (
                              <div key={item.id} className="flex items-center gap-3 text-[11px]">
                                <span className="text-muted-foreground font-mono w-24 truncate">{item.inventoryLotId.slice(0, 8)}</span>
                                <span className="font-mono text-foreground">{String(item.countedQuantity)} counted</span>
                                {item.expectedQuantity !== null && (
                                  <span className={`font-mono ${discrepancy ? "text-amber-700" : "text-muted-foreground"}`}>
                                    / {String(item.expectedQuantity)} expected
                                  </span>
                                )}
                                {discrepancy && <span className="text-[10px] text-amber-600">⚠</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="border border-border bg-card rounded p-8 text-center">
              <p className="text-[13px] text-muted-foreground">Select a consignment partner to view details.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {(creating || editing) && (
        <Modal
          open={creating || !!editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          title={creating ? "Add Consignment Partner" : "Edit Consignment"}
        >
          <ConsignmentForm
            initial={
              editing
                ? {
                    id: editing.id,
                    name: editing.name,
                    contactName: editing.contactName ?? "",
                    contactEmail: editing.contactEmail ?? "",
                    contactPhone: editing.contactPhone ?? "",
                    address: editing.address ?? "",
                    notes: editing.notes ?? "",
                  }
                : EMPTY_FORM
            }
            saving={saving}
            onSave={handleSave}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        </Modal>
      )}

      {/* Create Count Modal */}
      {creatingCount && selectedId && (
        <Modal open={creatingCount} onClose={() => setCreatingCount(false)} title="New Consignment Count">
          <CountForm
            onSave={handleCreateCount}
            onCancel={() => setCreatingCount(false)}
          />
        </Modal>
      )}
    </div>
  );
}

function ConsignmentForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial: typeof EMPTY_FORM & { id?: string };
  saving: boolean;
  onSave: (values: typeof EMPTY_FORM & { id?: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const set = (field: string, value: string) => setValues((prev) => ({ ...prev, [field]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!values.name.trim()) {
      setError("Partner shop name is required.");
      return;
    }
    try {
      await onSave(values);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <p role="alert" className="border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">{error}</p>
      )}
      <Field label="Shop Name" required>
        <Input
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Rustan's Makati"
          autoFocus
        />
      </Field>
      <FormRow>
        <Field label="Contact Name">
          <Input value={values.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Maria Santos" />
        </Field>
        <Field label="Contact Phone">
          <Input value={values.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="+63 912 345 6789" />
        </Field>
      </FormRow>
      <Field label="Contact Email">
        <Input type="email" value={values.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="maria@example.com" />
      </Field>
      <Field label="Address">
        <Input value={values.address} onChange={(e) => set("address", e.target.value)} placeholder="Makati City, Metro Manila" />
      </Field>
      <Field label="Notes">
        <Textarea value={values.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Terms, commission rates, delivery schedule..." />
      </Field>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
        <Btn type="submit" disabled={saving}>{saving ? "Saving..." : "Save Shop"}</Btn>
      </div>
    </form>
  );
}

function CountForm({
  onSave,
  onCancel,
}: {
  onSave: (data: { countedAt: string; notes: string; items: Array<{ inventoryLotId: string; countedQuantity: number; expectedQuantity?: number; discrepancyNote?: string }> }) => Promise<void>;
  onCancel: () => void;
}) {
  const [countedAt, setCountedAt] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave({ countedAt: new Date(countedAt).toISOString(), notes, items: [] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not record count.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <p role="alert" className="border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">{error}</p>
      )}
      <p className="text-[12px] text-muted-foreground">
        Record a snapshot of what stock is physically at this consignment. Counts are observations — they do not change stock levels. Add inventory items after creating the count.
      </p>
      <Field label="Count Date" required>
        <Input type="datetime-local" value={countedAt} onChange={(e) => setCountedAt(e.target.value)} />
      </Field>
      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Monthly inventory check..." />
      </Field>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
        <Btn type="submit" disabled={saving}>{saving ? "Recording..." : "Record Count"}</Btn>
      </div>
    </form>
  );
}
