import { describe, expect, it } from "vitest";
import { BACKUP_TABLES, checksum, createBackupBundle, validateBackupBundle } from "./backup-core.mjs";

const rowsByTable = () => Object.fromEntries(BACKUP_TABLES.map((table) => [table, []]));

describe("backup manifest", () => {
  it("creates and validates a complete deterministic manifest", () => {
    const rows = rowsByTable();
    rows.clients = [{ id: "client-1", name: "Seine" }];
    const bundle = createBackupBundle({
      createdAt: "2026-06-22T00:00:00.000Z",
      source: { database: "test", schema: "public" },
      schema: [{ table_name: "clients", column_name: "id" }],
      rowsByTable: rows,
    });

    expect(validateBackupBundle(bundle)).toBe(bundle);
    expect(bundle.manifest.tables.find((table) => table.name === "clients")).toMatchObject({ rowCount: 1 });
  });

  it("rejects tampered table data", () => {
    const bundle = createBackupBundle({
      createdAt: "2026-06-22T00:00:00.000Z",
      source: { database: "test", schema: "public" },
      schema: [],
      rowsByTable: rowsByTable(),
    });
    bundle.data.clients.push({ id: "injected" });

    expect(() => validateBackupBundle(bundle)).toThrow("Row count mismatch for clients");
  });

  it("hashes object keys deterministically", () => {
    expect(checksum({ b: 2, a: 1 })).toBe(checksum({ a: 1, b: 2 }));
  });
});
