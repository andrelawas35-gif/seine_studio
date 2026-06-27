import type { Project as FixtureProject } from "./data";

export type ProjectStage =
  | "inquiry"
  | "consultation"
  | "design"
  | "approved"
  | "sourcing"
  | "production"
  | "quality_control"
  | "ready"
  | "delivered"
  | "closed"
  | "cancelled";

export const STAGE_LABELS: Record<ProjectStage, string> = {
  inquiry: "Inquiry",
  consultation: "Consultation",
  design: "Design",
  approved: "Approved",
  sourcing: "Sourcing",
  production: "Production",
  quality_control: "QA",
  ready: "Ready",
  delivered: "Delivered",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const STAGE_ORDER: ProjectStage[] = [
  "inquiry",
  "consultation",
  "design",
  "approved",
  "sourcing",
  "production",
  "quality_control",
  "ready",
  "delivered",
  "closed",
  "cancelled",
];

export const ACTIVE_STAGES: ProjectStage[] = [
  "inquiry",
  "consultation",
  "design",
  "approved",
  "sourcing",
  "production",
  "quality_control",
  "ready",
];

export const STAGE_DOT_COLOR: Record<ProjectStage, string> = {
  inquiry: "bg-blue-400",
  consultation: "bg-sky-400",
  design: "bg-violet-400",
  approved: "bg-emerald-400",
  sourcing: "bg-teal-400",
  production: "bg-amber-500",
  quality_control: "bg-orange-400",
  ready: "bg-green-500",
  delivered: "bg-gray-400",
  closed: "bg-stone-400",
  cancelled: "bg-red-400",
};

export const STAGE_PILL_STYLE: Record<ProjectStage, string> = {
  inquiry: "bg-blue-50 text-blue-700 border-blue-200",
  consultation: "bg-sky-50 text-sky-700 border-sky-200",
  design: "bg-violet-50 text-violet-700 border-violet-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  sourcing: "bg-teal-50 text-teal-700 border-teal-200",
  production: "bg-amber-50 text-amber-700 border-amber-200",
  quality_control: "bg-orange-50 text-orange-700 border-orange-200",
  ready: "bg-green-50 text-green-700 border-green-200",
  delivered: "bg-gray-50 text-gray-500 border-gray-200",
  closed: "bg-stone-100 text-stone-600 border-stone-200",
  cancelled: "bg-red-50 text-red-500 border-red-200",
};

export interface ProjectRecord {
  id: string;
  projectNumber: string;
  clientId: string;
  clientName?: string;
  eventId?: string | null;
  eventName?: string | null;
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
  title: string;
  stage: ProjectStage;
  targetDate: string;
  brief: string;
}

export const EMPTY_PROJECT_FORM: ProjectFormValues = {
  projectNumber: "",
  clientId: "",
  eventId: "",
  title: "",
  stage: "inquiry",
  targetDate: "",
  brief: "",
};

const FIXTURE_STAGE_MAP: Record<string, ProjectStage> = {
  Inquiry: "inquiry",
  Design: "design",
  Production: "production",
  QA: "quality_control",
  Delivery: "ready",
  Paid: "delivered",
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
    title: project.title,
    stage: project.stage,
    targetDate: project.targetDate?.slice(0, 10) ?? "",
    brief: project.brief ?? "",
  };
}
