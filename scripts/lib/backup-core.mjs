import { createHash } from "node:crypto";

export const BACKUP_FORMAT = "seine-studio-backup";
export const BACKUP_VERSION = 1;

// Parent tables must precede their dependants during restore.
export const BACKUP_TABLES = [
  "app_users",
  "clients",
  "locations",
  "catalog_pieces",
  "inventory_lots",
  "projects",
  "events",
  "event_tasks",
  "event_inventory_allocations",
  "event_budget_lines",
  "stock_movements",
  "pricing_calculations",
  "pricing_versions",
  "reply_templates",
  "reply_template_versions",
  "activity_events",
];

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableValue(child)]),
    );
  }
  return value;
}

export function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

export function checksum(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export function createBackupBundle({ createdAt, source, schema, rowsByTable }) {
  const data = {};
  const tables = BACKUP_TABLES.map((name) => {
    const rows = rowsByTable[name];
    if (!Array.isArray(rows)) throw new Error(`Missing backup rows for ${name}`);
    data[name] = rows;
    return { name, rowCount: rows.length, sha256: checksum(rows) };
  });

  return {
    manifest: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt,
      source,
      schemaSha256: checksum(schema),
      tables,
    },
    data,
  };
}

export function validateBackupBundle(bundle) {
  if (!bundle || typeof bundle !== "object") throw new Error("Backup must be a JSON object");
  const { manifest, data } = bundle;
  if (manifest?.format !== BACKUP_FORMAT || manifest?.version !== BACKUP_VERSION) {
    throw new Error("Unsupported Seine Studio backup format or version");
  }
  if (!manifest.createdAt || !manifest.schemaSha256 || !Array.isArray(manifest.tables)) {
    throw new Error("Backup manifest is incomplete");
  }
  if (!data || typeof data !== "object") throw new Error("Backup data is missing");

  const names = manifest.tables.map((table) => table.name);
  if (stableJson(names) !== stableJson(BACKUP_TABLES)) {
    throw new Error("Backup table manifest is incomplete or out of restore order");
  }

  for (const table of manifest.tables) {
    const rows = data[table.name];
    if (!Array.isArray(rows)) throw new Error(`Backup table ${table.name} is missing`);
    if (rows.length !== table.rowCount) throw new Error(`Row count mismatch for ${table.name}`);
    if (checksum(rows) !== table.sha256) throw new Error(`Checksum mismatch for ${table.name}`);
  }

  return bundle;
}
