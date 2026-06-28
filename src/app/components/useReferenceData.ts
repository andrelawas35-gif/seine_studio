import { useEffect, useState } from "react";
import { apiRequest } from "../api";
import {
  INITIAL_CLIENTS,
  INITIAL_INVENTORY,
  INITIAL_PROJECTS,
  type Client,
  type InventoryItem,
  type Project,
  type Stage,
} from "../data";
import type { ProjectRecord, ProjectStage } from "../projects";
import type { ClientRecord } from "../clients";
import { stockStatusFromQuantity, type InventoryLotRecord } from "../inventory";

const USE_DATABASE = import.meta.env.VITE_DATA_MODE === "api";

// Record stages collapse onto the 6-stage fixture model. The fixture `stage` is no
// longer read by the consumers (pickers filter on type / match by name), so this is
// only a best-effort label.
const STAGE_TO_FIXTURE: Record<ProjectStage, Stage> = {
  inquiry: "Inquiry",
  design: "Design",
  approved: "Design",
  production: "Production",
  quality_control: "QA",
  ready: "Delivery",
  delivered: "Paid",
  cancelled: "Inquiry",
};

function projectRecordToFixture(p: Omit<ProjectRecord, "source">): Project {
  return {
    id: p.id,
    name: p.title,
    client: p.clientName ?? "—",
    // ProjectRecord has no commission/collection type; default so it shows in pickers.
    type: "Commission",
    stage: STAGE_TO_FIXTURE[p.stage] ?? "Inquiry",
    // Price is derived from quotes/invoices, never stored on the project record.
    price: 0,
    downpaid: false,
    due: p.targetDate ?? "",
    description: p.brief ?? "",
  };
}

function clientRecordToFixture(c: Omit<ClientRecord, "source">): Client {
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? "",
    phone: c.phone ?? "",
    location: c.preferences ?? "",
    notes: c.notes ?? "",
    // totalSpent is derived from invoices; not duplicated here.
    totalSpent: 0,
    since: "",
    projects: [],
  };
}

function lotRecordToFixture(l: Omit<InventoryLotRecord, "source">): InventoryItem {
  const quantity = Number(l.onHandQuantity) || 0;
  return {
    id: l.id,
    name: l.description,
    // The fixture category enum has no record equivalent; pickers treat lots as materials.
    category: "Findings",
    quantity,
    unit: l.unit,
    costPerUnit: (l.unitCostCents ?? 0) / 100,
    status: stockStatusFromQuantity(quantity),
  };
}

export interface ReferenceData {
  projects: Project[];
  clients: Client[];
  inventory: InventoryItem[];
  loading: boolean;
}

/**
 * Live projects / clients / inventory adapted to the fixture shapes that the
 * pricing calculator and reply-template pickers consume. Falls back to fixtures
 * when the app is not in API mode. Lets those pages stop receiving empty props.
 */
export function useReferenceData(): ReferenceData {
  const [projects, setProjects] = useState<Project[]>(() => (USE_DATABASE ? [] : INITIAL_PROJECTS));
  const [clients, setClients] = useState<Client[]>(() => (USE_DATABASE ? [] : INITIAL_CLIENTS));
  const [inventory, setInventory] = useState<InventoryItem[]>(() => (USE_DATABASE ? [] : INITIAL_INVENTORY));
  const [loading, setLoading] = useState(USE_DATABASE);

  useEffect(() => {
    if (!USE_DATABASE) return;
    let active = true;
    setLoading(true);
    Promise.allSettled([
      apiRequest<{ data: Array<Omit<ProjectRecord, "source">> }>("/projects?limit=100"),
      apiRequest<{ data: Array<Omit<ClientRecord, "source">> }>("/clients?limit=100"),
      apiRequest<{ data: Array<Omit<InventoryLotRecord, "source">> }>("/inventory?limit=200"),
    ])
      .then(([projectRes, clientRes, inventoryRes]) => {
        if (!active) return;
        if (projectRes.status === "fulfilled") setProjects(projectRes.value.data.map(projectRecordToFixture));
        if (clientRes.status === "fulfilled") setClients(clientRes.value.data.map(clientRecordToFixture));
        if (inventoryRes.status === "fulfilled") setInventory(inventoryRes.value.data.map(lotRecordToFixture));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { projects, clients, inventory, loading };
}
