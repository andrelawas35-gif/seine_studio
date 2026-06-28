import { useEffect, useState, type FormEvent } from "react";
import { Plus, Save, Settings, Archive, Tag } from "lucide-react";
import { apiRequest, ApiError } from "../api";
import { Btn, Field, Input, Modal, Textarea } from "./Modal";
import { Combobox } from "./ui/combobox";
import { useToast } from "./Toast";

const USE_DATABASE = import.meta.env.VITE_DATA_MODE === "api";

interface SettingRecord {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

interface CatalogEntry {
  id: string;
  costType: string;
  description: string;
  unit: string;
  unitCostCents: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

const COST_TYPE_LABELS: Record<string, string> = {
  material: "Material",
  labor: "Labor",
  design: "Design",
  packaging: "Packaging",
  outsourced: "Outsourced",
  overhead: "Overhead",
  other: "Other",
  stones_gemstones: "Stones & Gemstones",
  metal_findings: "Metal & Findings",
  finishing_plating: "Finishing & Plating",
  setting_engraving: "Setting & Engraving",
};

const COST_TYPE_OPTIONS = Object.entries(COST_TYPE_LABELS).map(([value, label]) => ({ value, label }));

const SETTING_LABELS: Record<string, { label: string; hint: string; type: "number" | "text" }> = {
  default_markup_percent: { label: "Default Markup (%)", hint: "Default percentage markup applied to quotes", type: "number" },
  studio_buffer_percent: { label: "Studio Buffer (%)", hint: "Stock percentage held back from event allocation", type: "number" },
  vat_rate: { label: "VAT Rate (%)", hint: "Value-added tax rate", type: "number" },
  daily_reminder_hour: { label: "Daily Reminder Hour (0–23)", hint: "Hour of day to send push reminders", type: "number" },
  low_stock_threshold: { label: "Low Stock Threshold", hint: "Minimum quantity before stock is flagged low", type: "number" },
};

function centavosToPesos(c: number) {
  return (c / 100).toFixed(2);
}

function pesosToCentavos(p: string): number {
  return Math.round(Number(p) * 100);
}

export function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SettingRecord[]>([]);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(USE_DATABASE);
  const [tab, setTab] = useState<"parameters" | "catalog">("parameters");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<CatalogEntry | null>(null);
  const [creatingEntry, setCreatingEntry] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!USE_DATABASE) return;
    setLoading(true);
    try {
      const [settingsRes, catalogRes] = await Promise.all([
        apiRequest<{ data: SettingRecord[] }>("/settings"),
        apiRequest<{ entries: CatalogEntry[] }>("/cost-catalog"),
      ]);
      setSettings(settingsRes.data);
      setCatalog(catalogRes.entries.filter((e) => !e.isArchived));
    } catch (caught) {
      const msg = caught instanceof ApiError ? caught.message : "Could not load settings.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSettingSave = async (key: string, value: string) => {
    setSavingKey(key);
    try {
      await apiRequest(`/settings?key=${encodeURIComponent(key)}`, {
        method: "PUT",
        body: JSON.stringify({ value }),
      });
      toast.success("Setting updated.");
      setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
    } catch (caught) {
      const msg = caught instanceof ApiError ? caught.message : "Could not save.";
      toast.error(msg);
    } finally {
      setSavingKey(null);
    }
  };

  const handleCatalogSave = async (entry: CatalogEntry) => {
    setSaving(true);
    try {
      if (entry.id) {
        await apiRequest(`/cost-catalog?id=${entry.id}`, {
          method: "PUT",
          body: JSON.stringify({
            costType: entry.costType,
            description: entry.description,
            unit: entry.unit,
            unitCostCents: entry.unitCostCents,
          }),
        });
        toast.success("Catalog entry updated.");
      } else {
        await apiRequest("/cost-catalog", {
          method: "POST",
          body: JSON.stringify({
            costType: entry.costType,
            description: entry.description,
            unit: entry.unit,
            unitCostCents: entry.unitCostCents,
          }),
        });
        toast.success("Catalog entry created.");
      }
      setEditingEntry(null);
      setCreatingEntry(false);
      await loadData();
    } catch (caught) {
      const msg = caught instanceof ApiError ? caught.message : "Could not save.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await apiRequest(`/cost-catalog?id=${id}`, { method: "DELETE" });
      toast.success("Entry archived.");
      await loadData();
    } catch (caught) {
      const msg = caught instanceof ApiError ? caught.message : "Could not archive.";
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
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <h1 className="font-serif text-xl tracking-tight text-foreground">Settings</h1>
        <span className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground">Studio Configuration</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-border" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "parameters"}
          onClick={() => setTab("parameters")}
          className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors ${
            tab === "parameters"
              ? "border-accent text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings size={14} />
          Tunable Parameters
        </button>
        <button
          role="tab"
          aria-selected={tab === "catalog"}
          onClick={() => setTab("catalog")}
          className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors ${
            tab === "catalog"
              ? "border-accent text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Tag size={14} />
          Cost Catalog
        </button>
      </div>

      {!USE_DATABASE && (
        <div className="border border-border bg-card p-6 text-center">
          <p className="text-[12px] text-muted-foreground">
            Settings and the cost catalog require database access. They are available in the live
            workspace, not the sample workspace.
          </p>
        </div>
      )}

      {USE_DATABASE && tab === "parameters" && (
        <div className="space-y-3">
          {settings.map((setting) => {
            const meta = SETTING_LABELS[setting.key] ?? { label: setting.key, hint: "", type: "text" as const };
            return (
              <form
                key={setting.key}
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const input = form.querySelector("input") as HTMLInputElement;
                  handleSettingSave(setting.key, input.value);
                }}
                className="flex items-start gap-4 p-4 border border-border bg-card rounded"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <label className="text-[13px] font-medium text-foreground">{meta.label}</label>
                  <p className="text-[11px] text-muted-foreground">{meta.hint}</p>
                  <input
                    type={meta.type === "number" ? "number" : "text"}
                    defaultValue={setting.value}
                    min={meta.type === "number" ? "0" : undefined}
                    max={meta.type === "number" && setting.key.includes("percent") ? "100" : undefined}
                    className="mt-2 w-full border border-border bg-muted/30 px-3 py-2 text-[13px] text-foreground rounded focus:outline-none focus:ring-1 focus:ring-accent/40 font-mono"
                  />
                  {setting.description && (
                    <p className="text-[10px] text-muted-foreground">Last updated: {new Date(setting.updatedAt).toLocaleDateString()}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={savingKey === setting.key}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded border border-border bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  title={`Save ${meta.label}`}
                >
                  <Save size={14} className={savingKey === setting.key ? "animate-pulse" : ""} />
                </button>
              </form>
            );
          })}
        </div>
      )}

      {USE_DATABASE && tab === "catalog" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-muted-foreground">
              {catalog.length} active {catalog.length === 1 ? "entry" : "entries"}
            </p>
            <Btn
              onClick={() => {
                setEditingEntry({
                  id: "",
                  costType: "material",
                  description: "",
                  unit: "piece",
                  unitCostCents: 0,
                  isArchived: false,
                  createdAt: "",
                  updatedAt: "",
                });
                setCreatingEntry(true);
              }}
            >
              <Plus size={14} />
              Add Entry
            </Btn>
          </div>

          {/* Group by cost type */}
          {COST_TYPE_OPTIONS.map(({ value: costType, label: typeLabel }) => {
            const entries = catalog.filter((e) => e.costType === costType);
            if (entries.length === 0) return null;
            return (
              <section key={costType} className="border border-border bg-card rounded p-4 space-y-2">
                <h3 className="font-serif text-sm text-foreground">{typeLabel}</h3>
                <div className="divide-y divide-border">
                  {entries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-foreground">{entry.description}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          ₱{centavosToPesos(entry.unitCostCents)} / {entry.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-3">
                        <button
                          type="button"
                          onClick={() => setEditingEntry(entry)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(entry.id)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[11px] text-muted-foreground hover:text-red-600 transition-colors"
                          title="Archive"
                        >
                          <Archive size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {catalog.length === 0 && (
            <div className="text-center py-12 border border-border bg-card rounded">
              <p className="text-[13px] text-muted-foreground">No cost catalog entries yet.</p>
              <p className="text-[11px] text-muted-foreground mt-1">Add materials, labor rates, and packaging costs for the pricing calculator.</p>
            </div>
          )}
        </div>
      )}

      {/* Catalog Edit Modal */}
      {editingEntry && (
        <Modal
          open={!!editingEntry}
          onClose={() => {
            setEditingEntry(null);
            setCreatingEntry(false);
          }}
          title={creatingEntry ? "Add Catalog Entry" : "Edit Catalog Entry"}
        >
          <CatalogForm
            entry={editingEntry}
            saving={saving}
            onSave={handleCatalogSave}
            onCancel={() => {
              setEditingEntry(null);
              setCreatingEntry(false);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function CatalogForm({
  entry,
  saving,
  onSave,
  onCancel,
}: {
  entry: CatalogEntry;
  saving: boolean;
  onSave: (entry: CatalogEntry) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(entry);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!values.description.trim()) {
      setError("Description is required.");
      return;
    }
    if (!values.unit.trim()) {
      setError("Unit is required.");
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
      <Field label="Cost Type" required>
        <Combobox
          options={COST_TYPE_OPTIONS}
          value={values.costType}
          onValueChange={(v) => setValues({ ...values, costType: v })}
          placeholder="Select cost type..."
          aria-label="Cost type"
        />
      </Field>
      <Field label="Description" required>
        <Input
          value={values.description}
          onChange={(e) => setValues({ ...values, description: e.target.value })}
          placeholder="Freshwater pearl (round, 8mm)"
          autoFocus
        />
      </Field>
      <Field label="Unit" required>
        <Input
          value={values.unit}
          onChange={(e) => setValues({ ...values, unit: e.target.value })}
          placeholder="piece, hour, carat, gram..."
        />
      </Field>
      <Field label="Unit Cost (₱)">
        <Input
          inputMode="decimal"
          value={centavosToPesos(values.unitCostCents)}
          onChange={(e) =>
            setValues({ ...values, unitCostCents: pesosToCentavos(e.target.value) })
          }
          placeholder="0.00"
        />
      </Field>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
        <Btn type="submit" disabled={saving}>{saving ? "Saving..." : "Save Entry"}</Btn>
      </div>
    </form>
  );
}
