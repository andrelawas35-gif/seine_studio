import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { checksum, validateBackupBundle } from "./lib/backup-core.mjs";
import {
  assertEmptyTarget,
  createSql,
  readSchema,
  restoreDatabaseBackup,
  verifyRestoredDatabase,
} from "./lib/database-backup.mjs";

const filename = process.argv[2];
if (!filename) throw new Error("Usage: npm run db:restore -- path/to/backup.json");

const bundle = validateBackupBundle(JSON.parse(await readFile(resolve(filename), "utf8")));
const sql = createSql(process.env.RESTORE_DATABASE_URL);
const targetSchema = await readSchema(sql);
if (checksum(targetSchema) !== bundle.manifest.schemaSha256) {
  throw new Error("Restore target schema does not match the backup. Apply the same migrations first.");
}

await assertEmptyTarget(sql);
await restoreDatabaseBackup(sql, bundle);
await verifyRestoredDatabase(sql, bundle);
console.log(`Restore verified: ${bundle.manifest.tables.reduce((sum, table) => sum + table.rowCount, 0)} rows`);
