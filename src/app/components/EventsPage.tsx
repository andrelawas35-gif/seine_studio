import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Check, ChevronRight, DollarSign, FolderOpen, MapPin, PackageCheck, Plus, ShoppingBag, Target, TrendingUp } from "lucide-react";
import { apiRequest, ApiError } from "../api";
import {
  EMPTY_EVENT_FORM,
  EVENT_STAGE_LABELS,
  DEFAULT_EVENT_TASKS,
  buildStockSuggestions,
  type EventAllocationRecord,
  type EventBudgetLineRecord,
  type EventDetail,
  type EventFormValues,
  type EventRecord,
  type EventTaskRecord,
} from "../events";
import { STAGE_DOT_COLOR, STAGE_LABELS, type ProjectStage } from "../projects";
import { Btn, Field, FormRow, Input, Modal, Textarea } from "./Modal";
import { Combobox } from "./ui/combobox";
import { RecordSaleModal } from "./ui/record-sale-modal";
import { useToast } from "./Toast";

const USE_DATABASE = import.meta.env.VITE_DATA_MODE === "api";
const TABS = ["overview", "stock", "checklist", "budget", "finance"] as const;
type Tab = (typeof TABS)[number];
type LocationOption = { id: string; name: string; type: string };

const php = (cents: number | null | undefined) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(
    (cents ?? 0) / 100,
  );
const eventDate = (iso: string) =>
  new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(
    new Date(iso),
  );

function Metric({ label, value, detail, accent }: { label: string; value: string; detail: string; accent?: boolean }) {
  return (
    <div className={`border p-4 ${accent ? "border-[#A07840] bg-[#B8975A] text-white" : "border-border bg-card"}`}>
      <p className={`text-[11px] uppercase tracking-[0.18em] ${accent ? "text-[#F5E8C8]" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className="mt-2 font-serif text-xl font-light">{value}</p>
      <p className={`mt-1 text-[11px] ${accent ? "text-[#F5E8C8]/75" : "text-muted-foreground"}`}>{detail}</p>
    </div>
  );
}

function EventForm({
  saving,
  onCancel,
  onSave,
}: {
  saving: boolean;
  onCancel: () => void;
  onSave: (values: EventFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState(EMPTY_EVENT_FORM);
  const [error, setError] = useState<string | null>(null);
  const set = (field: keyof EventFormValues, value: string) => setValues((current) => ({ ...current, [field]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!values.name || !values.startsAt || !values.endsAt) return setError("Name, start, and end are required.");
    try {
      await onSave(values);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The event could not be created.");
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      {error ? (
        <p role="alert" className="border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
          {error}
        </p>
      ) : null}
      <Field label="Event name" required>
        <Input
          aria-label="Event name"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Makati Weekend Pop-up"
          autoFocus
        />
      </Field>
      <FormRow>
        <Field label="Type">
          <Combobox
            options={[
              { value: "Pop-up", label: "Pop-up" },
              { value: "Market", label: "Market" },
              { value: "Trunk show", label: "Trunk show" },
              { value: "Private appointment", label: "Private appointment" },
            ]}
            value={values.type}
            onValueChange={(v) => set("type", v)}
            placeholder="Select type…"
            searchPlaceholder="Search type…"
            aria-label="Event type"
          />
        </Field>
        <Field label="Organizer">
          <Input value={values.organizer} onChange={(e) => set("organizer", e.target.value)} />
        </Field>
      </FormRow>
      <Field label="Venue">
        <Input value={values.venue} onChange={(e) => set("venue", e.target.value)} />
      </Field>
      <Field label="Instagram handle">
        <Input
          value={values.instagramHandle}
          onChange={(e) => set("instagramHandle", e.target.value)}
          placeholder="@seinestudio"
        />
      </Field>
      <Field label="Address">
        <Input
          value={values.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="Makati City, Metro Manila"
        />
      </Field>
      <FormRow>
        <Field label="Starts" required>
          <Input type="datetime-local" value={values.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
        </Field>
        <Field label="Ends" required>
          <Input type="datetime-local" value={values.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
        </Field>
      </FormRow>
      <FormRow>
        <Field label="Revenue target">
          <Input
            inputMode="decimal"
            value={values.revenueTarget}
            onChange={(e) => set("revenueTarget", e.target.value)}
            placeholder="150000"
          />
        </Field>
        <Field label="Budget">
          <Input
            inputMode="decimal"
            value={values.budget}
            onChange={(e) => set("budget", e.target.value)}
            placeholder="25000"
          />
        </Field>
      </FormRow>
      <Field label="Studio stock buffer (%)">
        <Input
          type="number"
          min="0"
          max="100"
          value={values.studioBufferPercent}
          onChange={(e) => set("studioBufferPercent", e.target.value)}
        />
      </Field>
      <Field label="Notes">
        <Textarea
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Audience, collection focus, organizer requirements..."
        />
      </Field>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Btn variant="secondary" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn type="submit" disabled={saving}>
          {saving ? "Creating..." : "Create workspace"}
        </Btn>
      </div>
    </form>
  );
}

export function EventsPage() {
  const { toast } = useToast();
  const [records, setRecords] = useState<EventRecord[]>([]);
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationOption[]>([
    { id: "sample-studio", name: "Seine Studio", type: "studio" },
  ]);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(USE_DATABASE);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [allocationLotId, setAllocationLotId] = useState<string | null>(null);
  const [saleOpen, setSaleOpen] = useState(false);

  useEffect(() => {
    if (!USE_DATABASE) return;
    setLoading(true);
    Promise.all([
      apiRequest<{ data: EventRecord[] }>("/events?limit=100"),
      apiRequest<{ data: LocationOption[] }>("/locations"),
    ])
      .then(([eventResponse, locationResponse]) => {
        setRecords(eventResponse.data);
        setLocations(locationResponse.data.filter((location) => location.type !== "event"));
        if (eventResponse.data[0]) setSelectedId(eventResponse.data[0].id);
      })
      .catch((caught) =>
        setError(
          caught instanceof ApiError && caught.status === 401
            ? "Sign in to load event planning."
            : caught instanceof Error
              ? caught.message
              : "Events could not be loaded.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  async function loadDetail(id: string) {
    if (!USE_DATABASE) return;
    const response = await apiRequest<{ data: EventDetail }>(`/events/${id}`);
    setDetail(response.data);
  }
  useEffect(() => {
    if (selectedId)
      void loadDetail(selectedId).catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Event details could not be loaded."),
      );
  }, [selectedId]);

  const completedTasks = detail?.tasks.filter((task) => task.status === "complete").length ?? 0;
  const plannedBudget = detail?.budgetLines.reduce((sum, line) => sum + line.plannedAmountCents, 0) ?? 0;
  const plannedUnits = detail?.allocations.reduce((sum, allocation) => sum + Number(allocation.plannedQuantity), 0) ?? 0;
  const progress = detail?.tasks.length ? Math.round((completedTasks / detail.tasks.length) * 100) : 0;

  async function createEvent(values: EventFormValues) {
    setSaving(true);
    try {
      const payload = {
        name: values.name,
        type: values.type,
        organizer: values.organizer,
        venue: values.venue,
        instagramHandle: values.instagramHandle,
        address: values.address,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
        revenueTargetCents: values.revenueTarget ? Math.round(Number(values.revenueTarget) * 100) : undefined,
        budgetCents: values.budget ? Math.round(Number(values.budget) * 100) : undefined,
        studioBufferPercent: Number(values.studioBufferPercent || 0),
        notes: values.notes,
      };
      if (USE_DATABASE) {
        if (!navigator.onLine) throw new Error("Reconnect before creating an event workspace.");
        const response = await apiRequest<{ data: EventRecord }>("/events", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setRecords((current) => [response.data, ...current]);
        setSelectedId(response.data.id);
        await loadDetail(response.data.id);
      } else {
        const now = new Date().toISOString();
        const event: EventRecord = {
          id: `sample-${crypto.randomUUID()}`,
          stage: "planning",
          locationId: "sample-event-location",
          createdAt: now,
          updatedAt: now,
          organizer: values.organizer || null,
          venue: values.venue || null,
          instagramHandle: values.instagramHandle || null,
          notes: values.notes || null,
          revenueTargetCents: payload.revenueTargetCents ?? null,
          budgetCents: payload.budgetCents ?? null,
          name: payload.name,
          type: payload.type,
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
          studioBufferPercent: payload.studioBufferPercent,
        };
        const next: EventDetail = {
          event,
          allocations: [],
          budgetLines: [],
          linkedProjects: [],
          tasks: DEFAULT_EVENT_TASKS.map((task) => ({
            ...task,
            id: crypto.randomUUID(),
            status: "not_started" as const,
          })),
          stockSuggestions: buildStockSuggestions(),
        };
        setRecords((current) => [event, ...current]);
        setSelectedId(event.id);
        setDetail(next);
      }
      setCreating(false);
      toast.success("Event workspace created", "The preparation checklist is ready.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task: EventTaskRecord) {
    const status = task.status === "complete" ? "not_started" : "complete";
    setDetail((current) => ({
      ...current!,
      tasks: current!.tasks.map((item) => (item.id === task.id ? { ...item, status } : item)),
    }));
    if (!USE_DATABASE) return;
    try {
      await apiRequest(`/events/${detail!.event.id}/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    } catch (caught) {
      setDetail((current) => ({ ...current!, tasks: current!.tasks.map((item) => (item.id === task.id ? task : item)) }));
      toast.error("Task was not updated", caught instanceof Error ? caught.message : undefined);
    }
  }

  async function addTask(title: string) {
    if (!title.trim()) return;
    const task = USE_DATABASE
      ? (
          await apiRequest<{ data: EventTaskRecord }>(`/events/${detail!.event.id}/tasks`, {
            method: "POST",
            body: JSON.stringify({ title }),
          })
        ).data
      : {
          id: crypto.randomUUID(),
          title,
          status: "not_started" as const,
          dueAt: null,
          notes: null,
          sortOrder: detail!.tasks.length,
        };
    setDetail((current) => ({ ...current!, tasks: [...current!.tasks, task] }));
    setTaskOpen(false);
    toast.success("Checklist updated");
  }

  async function addBudgetLine(category: string, description: string, amount: string) {
    const payload = { category, description, plannedAmountCents: Math.round(Number(amount) * 100) };
    const line: EventBudgetLineRecord = USE_DATABASE
      ? (
          await apiRequest<{ data: EventBudgetLineRecord }>(`/events/${detail!.event.id}/budget`, {
            method: "POST",
            body: JSON.stringify(payload),
          })
        ).data
      : { id: crypto.randomUUID(), ...payload };
    setDetail((current) => ({ ...current!, budgetLines: [...current!.budgetLines, line] }));
    setBudgetOpen(false);
    toast.success("Budget line added");
  }

  async function reserveStock(quantity: string, sourceLocationId: string, notes: string) {
    const suggestion = detail!.stockSuggestions.find((item) => item.id === allocationLotId);
    if (!suggestion) return;
    if (USE_DATABASE) {
      if (!navigator.onLine) throw new Error("Reconnect before reserving stock.");
      await apiRequest(`/events/${detail!.event.id}/allocations`, {
        method: "POST",
        body: JSON.stringify({ inventoryLotId: suggestion.id, sourceLocationId, plannedQuantity: quantity, notes }),
      });
      await loadDetail(detail!.event.id);
    } else {
      const allocation: EventAllocationRecord = {
        id: crypto.randomUUID(),
        inventoryLotId: suggestion.id,
        lotCode: suggestion.code,
        description: suggestion.description,
        unit: suggestion.unit,
        sourceLocationId,
        sourceLocationName: locations.find((location) => location.id === sourceLocationId)?.name ?? "Studio",
        plannedQuantity: quantity,
        openingQuantity: null,
        closingQuantity: null,
        status: "reserved",
        notes: notes || null,
      };
      setDetail((current) => ({
        ...current!,
        allocations: [...current!.allocations, allocation],
        stockSuggestions: current!.stockSuggestions.map((item) =>
          item.id === suggestion.id
            ? { ...item, availableQuantity: String(Number(item.availableQuantity) - Number(quantity)) }
            : item,
        ),
      }));
    }
    setAllocationLotId(null);
    toast.success("Stock reserved", `${quantity} ${suggestion.unit} added to the pull plan.`);
  }

  const selectedSuggestion = detail?.stockSuggestions.find((item) => item.id === allocationLotId);
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-accent">Event workspace</p>
          <h1 className="mt-1 font-serif text-2xl font-light">Events & Pop-ups</h1>
          <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
            Plan the room, the stock, and the numbers before anything leaves the studio.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex min-h-11 items-center justify-center gap-2 bg-foreground px-4 text-[12px] font-medium text-background"
        >
          <Plus size={14} />
          New event
        </button>
      </div>
      {error ? (
        <p role="alert" className="border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="h-48 animate-pulse border border-border bg-card" />
      ) : records.length === 0 ? (
        <EmptyEvents onCreate={() => setCreating(true)} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="border border-border bg-card p-2 lg:self-start">
            <p className="px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Event calendar</p>
            {records.map((event) => (
              <button
                key={event.id}
                onClick={() => {
                  setSelectedId(event.id);
                  setTab("overview");
                  if (!USE_DATABASE) void loadDetail(event.id);
                }}
                className={`flex min-h-16 w-full items-center gap-3 border-t border-border px-3 text-left ${selectedId === event.id ? "bg-[#F1EADC]" : "hover:bg-muted/50"}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium">{event.name}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    {eventDate(event.startsAt)} · {EVENT_STAGE_LABELS[event.stage]}
                  </span>
                </span>
                <ChevronRight size={13} className="text-accent" />
              </button>
            ))}
          </aside>
          <section className="min-w-0 space-y-5">
            {!detail ? (
              <div className="h-48 animate-pulse border border-border bg-card" />
            ) : (<>
            <EventHeader detail={detail} progress={progress} />
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <Metric
                accent
                label="Revenue target"
                value={php(detail.event.revenueTargetCents)}
                detail="Before event expenses"
              />
              <Metric
                label="Stock pull"
                value={`${plannedUnits} units`}
                detail={`${detail.allocations.length} reserved lines`}
              />
              <Metric
                label="Planned spend"
                value={php(plannedBudget)}
                detail={`of ${php(detail.event.budgetCents)} budget`}
              />
              <Metric
                label="Checklist"
                value={`${completedTasks}/${detail.tasks.length}`}
                detail={`${detail.tasks.filter((task) => task.status === "blocked").length} blocked`}
              />
            </div>
            <nav className="flex overflow-x-auto border-b border-border">
              {TABS.map((item) => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className={`min-h-11 whitespace-nowrap border-b-2 px-4 text-[11px] font-medium uppercase tracking-[0.14em] ${tab === item ? "border-[#B8975A]" : "border-transparent text-muted-foreground"}`}
                >
                  {item}
                </button>
              ))}
            </nav>
            {tab === "overview" ? <Overview detail={detail} onStock={() => setTab("stock")} onRecordSale={() => setSaleOpen(true)} /> : null}
            {tab === "stock" ? <Stock detail={detail} onReserve={setAllocationLotId} /> : null}
            {tab === "checklist" ? (
              <Checklist tasks={detail.tasks} onToggle={toggleTask} onAdd={() => setTaskOpen(true)} />
            ) : null}
            {tab === "budget" ? (
              <Budget lines={detail.budgetLines} total={plannedBudget} onAdd={() => setBudgetOpen(true)} />
            ) : null}
            {tab === "finance" ? (
              <Finance eventId={detail.event.id} plannedBudget={plannedBudget} revenueTarget={detail.event.revenueTargetCents} />
            ) : null}
            </>)}
          </section>
        </div>
      )}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create event workspace"
        subtitle="This also creates a temporary event inventory location."
        width={620}
      >
        <EventForm saving={saving} onCancel={() => setCreating(false)} onSave={createEvent} />
      </Modal>
      <QuickTextModal open={taskOpen} onClose={() => setTaskOpen(false)} onSave={addTask} />
      <BudgetModal open={budgetOpen} onClose={() => setBudgetOpen(false)} onSave={addBudgetLine} />
      <AllocationModal
        open={Boolean(selectedSuggestion)}
        onClose={() => setAllocationLotId(null)}
        suggestion={selectedSuggestion}
        locations={locations}
        buffer={detail?.event.studioBufferPercent ?? 10}
        onSave={reserveStock}
      />
      <RecordSaleModal
        open={saleOpen}
        onClose={() => setSaleOpen(false)}
        eventId={detail?.event.id ?? ""}
        suggestions={detail?.stockSuggestions ?? []}
        onSold={() => {
          setSaleOpen(false);
          if (selectedId) void loadDetail(selectedId);
        }}
      />
    </div>
  );
}

function EmptyEvents({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="border border-dashed border-border py-20 text-center">
      <CalendarDays className="mx-auto text-accent" size={24} />
      <p className="mt-3 font-serif text-lg">No events planned yet</p>
      <button
        onClick={onCreate}
        className="mt-4 min-h-11 border border-border px-4 text-[11px] uppercase tracking-wider"
      >
        Create workspace
      </button>
    </div>
  );
}
function EventHeader({ detail, progress }: { detail: EventDetail; progress: number }) {
  return (
    <div className="border border-border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {EVENT_STAGE_LABELS[detail.event.stage]}
          </p>
          <h2 className="mt-2 font-serif text-xl font-light">{detail.event.name}</h2>
          <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <MapPin size={11} />
            {detail.event.venue || "Venue to be confirmed"} · {eventDate(detail.event.startsAt)}–
            {eventDate(detail.event.endsAt)}
          </p>
          {detail.event.instagramHandle && (
            <p className="mt-1 flex items-center gap-1 text-[12px] text-accent">
              @{detail.event.instagramHandle}
            </p>
          )}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Preparation</p>
          <p className="mt-1 font-serif text-2xl">{progress}%</p>
          <div className="mt-2 h-1 w-32 bg-muted">
            <div className="h-full bg-[#B8975A]" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
function Overview({ detail, onStock, onRecordSale }: { detail: EventDetail; onStock: () => void; onRecordSale: () => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="border border-border bg-card p-5">
        <Target size={16} className="text-accent" />
        <h3 className="mt-3 font-serif text-base">Planning brief</h3>
        <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
          {detail.event.notes || "Add the collection focus, audience, and organizer requirements."}
        </p>
      </div>
      <div className="border border-border bg-card p-5">
        <PackageCheck size={16} className="text-accent" />
        <h3 className="mt-3 font-serif text-base">Before packing</h3>
        <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
          Reserve stock first. Packing and counts remain separate so every piece can be reconciled.
        </p>
        <button
          onClick={onStock}
          className="mt-5 min-h-11 border border-border px-4 text-[11px] uppercase tracking-wider"
        >
          Review stock pull
        </button>
      </div>
      <div className="border border-border bg-card p-5">
        <DollarSign size={16} className="text-accent" />
        <h3 className="mt-3 font-serif text-base">Record a sale</h3>
        <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
          Sell finished pieces at the event. Creates an invoice, records stock-out, and logs payment in one step.
        </p>
        <button
          onClick={onRecordSale}
          className="mt-5 flex min-h-11 items-center gap-2 bg-foreground px-4 text-[11px] font-medium uppercase tracking-wider text-background"
        >
          <ShoppingBag size={13} />
          Record sale
        </button>
      </div>
      {/* Linked Projects */}
      {detail.linkedProjects && detail.linkedProjects.length > 0 && (
        <div className="md:col-span-2 border border-border bg-card p-5">
          <FolderOpen size={16} className="text-accent" />
          <h3 className="mt-3 font-serif text-base">Linked Projects</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Commissions originated at this event
          </p>
          <div className="mt-3 space-y-1">
            {detail.linkedProjects.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-3 py-2 border border-border text-[13px]"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STAGE_DOT_COLOR[p.stage as ProjectStage] ?? "bg-gray-400"}`}
                />
                <span className="font-mono text-[11px] tracking-wide text-muted-foreground">
                  {p.projectNumber}
                </span>
                <span className="flex-1 truncate">{p.title}</span>
                <span className="text-[11px] text-muted-foreground">
                  {p.clientName}
                </span>
                <span className="text-[10px] px-1.5 py-px border border-border text-muted-foreground">
                  {STAGE_LABELS[p.stage as ProjectStage] ?? p.stage}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function Stock({ detail, onReserve }: { detail: EventDetail; onReserve: (id: string) => void }) {
  const bufferPercent = detail.event.studioBufferPercent ?? 0;
  return (
    <div className="space-y-4">
      {bufferPercent > 0 && (
        <div className="border border-accent/30 bg-accent/5 px-5 py-3">
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium text-accent">{bufferPercent}% studio buffer</span> — available quantities below are reduced
            by this buffer to keep the studio supplied during the event.
          </p>
        </div>
      )}
      <ListPanel title="Reserved stock">
        {detail.allocations.length ? (
          detail.allocations.map((item) => (
            <div key={item.id} className="grid gap-2 border-b border-border px-5 py-4 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="text-[11px] font-medium">{item.description}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.lotCode} · {item.sourceLocationName}
                </p>
              </div>
              <p className="font-mono text-[11px]">
                {item.plannedQuantity} {item.unit}
              </p>
            </div>
          ))
        ) : (
          <EmptyLine text="No stock has been reserved." />
        )}
      </ListPanel>
      <ListPanel title="Available finished pieces">
        {detail.stockSuggestions.length ? (
          detail.stockSuggestions.map((item) => {
            const rawQty = Number(item.availableQuantity);
            const bufferAdjQty = Math.max(0, rawQty * (1 - bufferPercent / 100));
            return (
              <div key={item.id} className="flex min-h-16 items-center gap-3 border-b border-border px-5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium">{item.description}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {rawQty} {item.unit} on hand
                    {bufferPercent > 0 && (
                      <span> · <span className="text-accent font-medium">{bufferAdjQty} {item.unit}</span> pull-able</span>
                    )}
                  </p>
                  {item.retailPriceCents && item.retailPriceCents > 0 && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      Retail: {php(item.retailPriceCents)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onReserve(item.id)}
                  className="min-h-11 border border-border px-3 text-[11px] uppercase tracking-wider"
                >
                  Reserve
                </button>
              </div>
            );
          })
        ) : (
          <EmptyLine text="Receive finished-piece inventory before planning a stock pull." />
        )}
      </ListPanel>
    </div>
  );
}
function Checklist({
  tasks,
  onToggle,
  onAdd,
}: {
  tasks: EventTaskRecord[];
  onToggle: (task: EventTaskRecord) => void;
  onAdd: () => void;
}) {
  return (
    <ListPanel title="Preparation checklist" action={<AddButton onClick={onAdd} label="Add task" />}>
      {tasks.map((task) => (
        <button
          key={task.id}
          onClick={() => onToggle(task)}
          className="flex min-h-14 w-full items-center gap-3 border-b border-border px-5 text-left"
        >
          <span
            className={`flex h-5 w-5 items-center justify-center border ${task.status === "complete" ? "border-[#B8975A] bg-[#B8975A] text-white" : "border-border"}`}
          >
            {task.status === "complete" ? <Check size={12} /> : null}
          </span>
          <span className={`text-[12px] ${task.status === "complete" ? "text-muted-foreground line-through" : ""}`}>
            {task.title}
          </span>
        </button>
      ))}
    </ListPanel>
  );
}
function Budget({ lines, total, onAdd }: { lines: EventBudgetLineRecord[]; total: number; onAdd: () => void }) {
  return (
    <ListPanel title="Planned event budget" action={<AddButton onClick={onAdd} label="Add line" />}>
      {lines.map((line) => (
        <div
          key={line.id}
          className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-3 border-b border-border px-5"
        >
          <div>
            <p className="text-[11px] font-medium">{line.description}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{line.category}</p>
          </div>
          <p className="font-mono text-[11px]">{php(line.plannedAmountCents)}</p>
        </div>
      ))}
      <div className="flex justify-between bg-muted/40 px-5 py-4 text-[11px]">
        <span>Planned total</span>
        <strong className="font-mono">{php(total)}</strong>
      </div>
    </ListPanel>
  );
}
function ListPanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border bg-card">
      <div className="flex min-h-16 items-center justify-between border-b border-border px-5">
        <h3 className="font-serif text-base">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-11 items-center gap-1.5 px-3 text-[11px] uppercase tracking-wider text-accent"
    >
      <Plus size={13} />
      {label}
    </button>
  );
}
function EmptyLine({ text }: { text: string }) {
  return <p className="px-5 py-8 text-center text-[12px] text-muted-foreground">{text}</p>;
}

// ─── Finance Tab (Phase 2 — event-linked closeout) ──────────────────────────

interface EventFinanceData {
  expenses: { total: number; cogs: number; opex: number; count: number };
  revenue: { collected: number; outstanding: number; count: number };
}

function Finance({
  eventId,
  plannedBudget,
  revenueTarget,
}: {
  eventId: string;
  plannedBudget: number;
  revenueTarget: number | null;
}) {
  const [data, setData] = useState<EventFinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!USE_DATABASE) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      apiRequest<{ data: Array<{ amountCents: number; isCogs: boolean }> }>(
        `/api/expenses?eventId=${eventId}&limit=200`,
      ),
      apiRequest<{ data: Array<{ totalCents: number; paidCents: number; status: string }> }>(
        `/api/invoices?eventId=${eventId}&limit=200`,
      ),
    ])
      .then(([expRes, invRes]) => {
        const expenses = expRes.data || [];
        // Invoices are scoped to this event server-side (via their project's eventId).
        const invoices = invRes.data || [];
        const totalExp = expenses.reduce((s, e) => s + e.amountCents, 0);
        const cogs = expenses.filter((e) => e.isCogs).reduce((s, e) => s + e.amountCents, 0);
        const collected = invoices
          .filter((i) => i.status === "paid" || i.status === "partially_paid")
          .reduce((s, i) => s + i.paidCents, 0);
        const outstanding = invoices
          .filter((i) => i.status === "sent" || i.status === "partially_paid")
          .reduce((s, i) => s + (i.totalCents - i.paidCents), 0);
        setData({
          expenses: { total: totalExp, cogs, opex: totalExp - cogs, count: expenses.length },
          revenue: { collected, outstanding, count: invoices.length },
        });
      })
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Financial data could not be loaded."),
      )
      .finally(() => setLoading(false));
  }, [eventId]);

  if (!USE_DATABASE) {
    return (
      <ListPanel title="Event finance">
        <EmptyLine text="Event-linked financial closeout requires database access. Configure VITE_DATA_MODE=api to enable." />
      </ListPanel>
    );
  }

  if (loading) {
    return (
      <ListPanel title="Event finance">
        <div className="px-5 py-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse bg-[#EDE5D5] rounded" />
          ))}
        </div>
      </ListPanel>
    );
  }

  if (error) {
    return (
      <ListPanel title="Event finance">
        <p className="px-5 py-8 text-center text-[12px] text-red-600">{error}</p>
      </ListPanel>
    );
  }

  if (!data) return null;

  const targetCents = revenueTarget ?? 0;
  const breakEven = data.expenses.total > 0 && data.expenses.cogs > 0
    ? Math.round(data.expenses.total / (1 - data.expenses.cogs / Math.max(data.revenue.collected, 1)))
    : null;
  const grossProfit = data.revenue.collected - data.expenses.cogs;
  const netProfit = data.revenue.collected - data.expenses.total;

  return (
    <div className="space-y-4">
      {/* Revenue summary */}
      <ListPanel title="Revenue">
        <div className="grid grid-cols-2 gap-0">
          <div className="border-b border-r border-border px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Collected</p>
            <p className="mt-1 font-serif text-lg font-light text-emerald-800">{php(data.revenue.collected)}</p>
          </div>
          <div className="border-b border-border px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Outstanding</p>
            <p className="mt-1 font-serif text-lg font-light text-amber-700">{php(data.revenue.outstanding)}</p>
          </div>
          <div className="border-r border-border px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Revenue target</p>
            <p className="mt-1 font-serif text-lg font-light">{php(targetCents)}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Progress</p>
            <p className="mt-1 font-serif text-lg font-light">
              {targetCents > 0 ? `${Math.round((data.revenue.collected / targetCents) * 100)}%` : "—"}
            </p>
          </div>
        </div>
      </ListPanel>

      {/* Profitability */}
      <ListPanel title="Profitability">
        <div className="grid grid-cols-2 gap-0">
          <div className="border-b border-r border-border px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">COGS</p>
            <p className="mt-1 font-serif text-lg font-light text-amber-700">{php(data.expenses.cogs)}</p>
          </div>
          <div className="border-b border-border px-5 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">OPEX</p>
            <p className="mt-1 font-serif text-lg font-light text-slate-600">{php(data.expenses.opex)}</p>
          </div>
          <div className={`border-r border-border px-5 py-4 ${grossProfit >= 0 ? "" : "text-red-600"}`}>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Gross Profit</p>
            <p className="mt-1 font-serif text-lg font-light">{php(grossProfit)}</p>
          </div>
          <div className={`px-5 py-4 ${netProfit >= 0 ? "" : "text-red-600"}`}>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Net Profit</p>
            <p className="mt-1 font-serif text-lg font-light">{php(netProfit)}</p>
          </div>
        </div>
      </ListPanel>

      {/* Budget comparison */}
      <ListPanel title="Budget vs Actual">
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-[12px]">Planned budget</span>
            <span className="font-mono text-[12px]">{php(plannedBudget)}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-[12px]">Actual expenses</span>
            <span className="font-mono text-[12px]">{php(data.expenses.total)}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-4 bg-muted/20">
            <span className="text-[12px] font-medium">Variance</span>
            <span className={`font-mono text-[12px] font-medium ${data.expenses.total <= plannedBudget ? "text-emerald-700" : "text-red-600"}`}>
              {data.expenses.total <= plannedBudget ? "Under" : "Over"} by {php(Math.abs(plannedBudget - data.expenses.total))}
            </span>
          </div>
        </div>
      </ListPanel>

      {/* Break-even */}
      {breakEven !== null && breakEven > 0 && (
        <ListPanel title="Break-even estimate">
          <div className="px-5 py-4">
            <p className="text-[12px] text-muted-foreground">
              Based on actual COGS ratio, you need approximately{" "}
              <span className="font-mono font-medium text-foreground">{php(breakEven)}</span>{" "}
              in revenue to cover all event costs.
            </p>
            {data.revenue.collected >= breakEven ? (
              <p className="mt-2 text-[12px] text-emerald-700 font-medium">
                ✓ Break-even reached
              </p>
            ) : (
              <p className="mt-2 text-[12px] text-amber-700">
                {php(breakEven - data.revenue.collected)} still needed
              </p>
            )}
          </div>
        </ListPanel>
      )}

      {/* Sell-through summary */}
      <ListPanel title="Closeout notes">
        <div className="px-5 py-4">
          <p className="text-[12px] text-muted-foreground">
            Event closeout requires reviewed stock reconciliation. Record opening/closing counts in the Stock tab, then
            link sales, expenses, and payments to this event for complete profitability reporting.
          </p>
          <p className="mt-2 text-[12px] text-muted-foreground">
            {data.expenses.count} expense{data.expenses.count !== 1 ? "s" : ""} and{" "}
            {data.revenue.count} invoice{data.revenue.count !== 1 ? "s" : ""} linked.
          </p>
        </div>
      </ListPanel>
    </div>
  );
}

function QuickTextModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setValue("");
      setSaving(false);
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Add checklist task">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim() || saving) return;
          setSaving(true);
          void onSave(value).then(() => setValue("")).finally(() => setSaving(false));
        }}
        className="space-y-4"
      >
        <Field label="Task" required>
          <Input value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn variant="secondary" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Adding…" : "Add task"}</Btn>
        </div>
      </form>
    </Modal>
  );
}
function BudgetModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (category: string, description: string, amount: string) => Promise<void>;
}) {
  const [category, setCategory] = useState("Venue");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setCategory("Venue");
      setDescription("");
      setAmount("");
      setSaving(false);
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Add planned expense">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!description.trim() || !amount || saving) return;
          setSaving(true);
          void onSave(category, description, amount).finally(() => setSaving(false));
        }}
        className="space-y-4"
      >
        <Field label="Category">
          <Combobox
            options={["Venue", "Transport", "Display", "Packaging", "Marketing", "Other"].map(c => ({ value: c, label: c }))}
            value={category}
            onValueChange={setCategory}
            placeholder="Select category…"
            searchPlaceholder="Search category…"
            aria-label="Budget category"
          />
        </Field>
        <Field label="Description" required>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Planned amount" required>
          <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn variant="secondary" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Adding…" : "Add line"}</Btn>
        </div>
      </form>
    </Modal>
  );
}
function AllocationModal({
  open,
  onClose,
  suggestion,
  locations,
  buffer,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  suggestion: EventDetail["stockSuggestions"][number] | undefined;
  locations: LocationOption[];
  buffer: number;
  onSave: (quantity: string, source: string, notes: string) => Promise<void>;
}) {
  const [quantity, setQuantity] = useState("1");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const maximum = useMemo(
    () => (suggestion ? Number(suggestion.availableQuantity) * (1 - buffer / 100) : 0),
    [suggestion, buffer],
  );
  useEffect(() => {
    if (open) {
      setQuantity("1");
      setSource(locations[0]?.id ?? "");
      setError(null);
      setSaving(false);
    }
  }, [open, locations]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Reserve ${suggestion?.description ?? "stock"}`}
      subtitle={`${maximum.toFixed(2)} maximum after buffer`}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!source || Number(quantity) <= 0 || Number(quantity) > maximum)
            return setError("Choose a source and a quantity within the available limit.");
          if (saving) return;
          setSaving(true);
          void onSave(quantity, source, notes)
            .catch((caught) =>
              setError(caught instanceof Error ? caught.message : "Stock could not be reserved."),
            )
            .finally(() => setSaving(false));
        }}
        className="space-y-4"
      >
        {error ? (
          <p role="alert" className="border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
            {error}
          </p>
        ) : null}
        <Field label="Quantity">
          <Input
            type="number"
            min="0.0001"
            max={maximum}
            step="0.0001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>
        <Field label="Source">
          <Combobox
            options={[{ value: "", label: "Select location" }, ...locations.map(l => ({ value: l.id, label: l.name }))]}
            value={source}
            onValueChange={setSource}
            placeholder="Select location…"
            searchPlaceholder="Search location…"
            aria-label="Stock source"
          />
        </Field>
        <Field label="Packing note">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Btn variant="secondary" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={saving}>{saving ? "Reserving…" : "Confirm reservation"}</Btn>
        </div>
      </form>
    </Modal>
  );
}
