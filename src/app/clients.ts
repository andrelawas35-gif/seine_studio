import type { Client as FixtureClient } from "./data";

export interface ClientRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagramHandle: string | null;
  preferences: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  source: "database" | "fixture";
}

export interface ClientActivity {
  id: string;
  action: string;
  summary: string;
  createdAt: string;
  actorName: string;
}

export interface ClientFormValues {
  name: string;
  email: string;
  phone: string;
  instagramHandle: string;
  preferences: string;
  notes: string;
}

export const EMPTY_CLIENT_FORM: ClientFormValues = {
  name: "",
  email: "",
  phone: "",
  instagramHandle: "",
  preferences: "",
  notes: "",
};

export function fixtureClientToRecord(client: FixtureClient): ClientRecord {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    instagramHandle: null,
    preferences: client.location,
    notes: client.notes,
    createdAt: new Date(`${client.since} 1`).toISOString(),
    updatedAt: new Date(`${client.since} 1`).toISOString(),
    source: "fixture",
  };
}

export function clientToForm(client: ClientRecord): ClientFormValues {
  return {
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    instagramHandle: client.instagramHandle ?? "",
    preferences: client.preferences ?? "",
    notes: client.notes ?? "",
  };
}
