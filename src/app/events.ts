import { INITIAL_INVENTORY } from "./data";

export type EventStage =
  | "draft"
  | "planning"
  | "packing"
  | "ready"
  | "active"
  | "reconciliation"
  | "closed"
  | "cancelled";
export type EventTaskStatus = "not_started" | "in_progress" | "blocked" | "complete";

export interface EventRecord {
  id: string;
  name: string;
  type: string;
  stage: EventStage;
  organizer: string | null;
  venue: string | null;
  instagramHandle: string | null;
  locationId: string | null;
  startsAt: string;
  endsAt: string;
  revenueTargetCents: number | null;
  budgetCents: number | null;
  studioBufferPercent: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventTaskRecord {
  id: string;
  title: string;
  status: EventTaskStatus;
  dueAt: string | null;
  notes: string | null;
  sortOrder: number;
}

export interface EventBudgetLineRecord {
  id: string;
  category: string;
  description: string;
  plannedAmountCents: number;
}

export interface EventAllocationRecord {
  id: string;
  inventoryLotId: string;
  lotCode: string;
  description: string;
  unit: string;
  sourceLocationId: string;
  sourceLocationName: string;
  plannedQuantity: string;
  openingQuantity: string | null;
  closingQuantity: string | null;
  status: string;
  notes: string | null;
}

export interface EventStockSuggestion {
  id: string;
  code: string;
  description: string;
  unit: string;
  availableQuantity: string;
  retailPriceCents: number | null;
  costCents: number | null;
}

export interface EventLinkedProject {
  id: string;
  projectNumber: string;
  title: string;
  stage: string;
  clientName: string;
  targetDate: string | null;
}

export interface EventDetail {
  event: EventRecord;
  tasks: EventTaskRecord[];
  budgetLines: EventBudgetLineRecord[];
  allocations: EventAllocationRecord[];
  stockSuggestions: EventStockSuggestion[];
  linkedProjects: EventLinkedProject[];
}

export interface EventFormValues {
  name: string;
  type: string;
  organizer: string;
  venue: string;
  instagramHandle: string;
  address: string;
  startsAt: string;
  endsAt: string;
  revenueTarget: string;
  budget: string;
  studioBufferPercent: string;
  notes: string;
}

export const EMPTY_EVENT_FORM: EventFormValues = {
  name: "",
  type: "Pop-up",
  organizer: "",
  venue: "",
  instagramHandle: "",
  address: "",
  startsAt: "",
  endsAt: "",
  revenueTarget: "",
  budget: "",
  studioBufferPercent: "10",
  notes: "",
};

export const DEFAULT_EVENT_TASKS: EventTaskRecord[] = [
  { id: "task-1", title: "Confirm venue, fees, and organizer requirements", status: "not_started", dueAt: null, notes: null, sortOrder: 0 },
  { id: "task-2", title: "Plan stock pull and studio buffer", status: "not_started", dueAt: null, notes: null, sortOrder: 1 },
  { id: "task-3", title: "Prepare displays, mirrors, lighting, and signage", status: "not_started", dueAt: null, notes: null, sortOrder: 2 },
];

export function buildStockSuggestions(): EventStockSuggestion[] {
  return INITIAL_INVENTORY.slice(0, 5).map((item) => ({
    id: item.id,
    code: item.id,
    description: item.name,
    unit: item.unit,
    availableQuantity: String(item.quantity),
    retailPriceCents: null,
    costCents: Math.round(item.costPerUnit * 100),
  }));
}

export const EVENT_STAGE_LABELS: Record<EventStage, string> = {
  draft: "Draft",
  planning: "Planning",
  packing: "Packing",
  ready: "Ready",
  active: "Active",
  reconciliation: "Reconciliation",
  closed: "Closed",
  cancelled: "Cancelled",
};
