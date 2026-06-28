import type { Project as FixtureProject } from "./data";

/** Canonical 7-stage set per D12. Side state: cancelled. */
export type ProjectStage =
  | "inquiry"
  | "design"
  | "approved"
  | "production"
  | "quality_control"
  | "ready"
  | "delivered"
  | "cancelled";

export const STAGE_LABELS: Record<ProjectStage, string> = {
  inquiry: "Inquiry",
  design: "Design",
  approved: "Approved",
  production: "Production",
  quality_control: "QA",
  ready: "Ready",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STAGE_ORDER: ProjectStage[] = [
  "inquiry",
  "design",
  "approved",
  "production",
  "quality_control",
  "ready",
  "delivered",
  "cancelled",
];

export const ACTIVE_STAGES: ProjectStage[] = [
  "inquiry",
  "design",
  "approved",
  "production",
  "quality_control",
  "ready",
];

export const STAGE_DOT_COLOR: Record<ProjectStage, string> = {
  inquiry: "bg-blue-400",
  design: "bg-violet-400",
  approved: "bg-emerald-400",
  production: "bg-amber-500",
  quality_control: "bg-orange-400",
  ready: "bg-green-500",
  delivered: "bg-gray-400",
  cancelled: "bg-red-400",
};

export const STAGE_PILL_STYLE: Record<ProjectStage, string> = {
  inquiry: "bg-blue-50 text-blue-700 border-blue-200",
  design: "bg-violet-50 text-violet-700 border-violet-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  production: "bg-amber-50 text-amber-700 border-amber-200",
  quality_control: "bg-orange-50 text-orange-700 border-orange-200",
  ready: "bg-green-50 text-green-700 border-green-200",
  delivered: "bg-gray-50 text-gray-500 border-gray-200",
  cancelled: "bg-red-50 text-red-500 border-red-200",
};

export interface ProjectRecord {
  id: string;
  projectNumber: string;
  clientId: string;
  clientName?: string;
  eventId?: string | null;
  eventName?: string | null;
  catalogPieceId?: string | null;
  title: string;
  stage: ProjectStage;
  targetDate: string | null;
  brief: string | null;
  createdAt: string;
  updatedAt: string;
  source: "database" | "fixture";
}

export interface ProjectActivity {
  id: string;
  action: string;
  summary: string;
  createdAt: string;
  actorName: string;
}

export interface ProjectFormValues {
  projectNumber: string;
  clientId: string;
  eventId: string;
  catalogPieceId: string;
  title: string;
  stage: ProjectStage;
  targetDate: string;
  brief: string;
}

export const EMPTY_PROJECT_FORM: ProjectFormValues = {
  projectNumber: "",
  clientId: "",
  eventId: "",
  catalogPieceId: "",
  title: "",
  stage: "inquiry",
  targetDate: "",
  brief: "",
};

const FIXTURE_STAGE_MAP: Record<string, ProjectStage> = {
  Inquiry: "inquiry",
  Consultation: "inquiry",
  Design: "design",
  Approved: "approved",
  Sourcing: "production",
  Production: "production",
  QA: "quality_control",
  "Quality Check": "quality_control",
  Delivery: "ready",
  Ready: "ready",
  Paid: "delivered",
  Delivered: "delivered",
  Closed: "delivered",
  Cancelled: "cancelled",
};

export function fixtureProjectToRecord(project: FixtureProject): ProjectRecord {
  return {
    id: project.id,
    projectNumber: project.id,
    clientId: "",
    clientName: project.client,
    eventId: null,
    eventName: null,
    title: project.name,
    stage: FIXTURE_STAGE_MAP[project.stage] ?? "inquiry",
    targetDate: project.due,
    brief: project.description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: "fixture",
  };
}

export function projectToForm(project: ProjectRecord): ProjectFormValues {
  return {
    projectNumber: project.projectNumber,
    clientId: project.clientId,
    eventId: project.eventId ?? "",
    catalogPieceId: project.catalogPieceId ?? "",
    title: project.title,
    stage: project.stage,
    targetDate: project.targetDate?.slice(0, 10) ?? "",
    brief: project.brief ?? "",
  };
}
