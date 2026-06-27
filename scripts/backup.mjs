import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createDatabaseBackup, createSql } from "./lib/database-backup.mjs";

const sql = createSql(process.env.DATABASE_URL);
const bundle = await createDatabaseBackup(sql);
const directory = resolve(process.env.BACKUP_DIR || "backups");
const stamp = bundle.manifest.createdAt.replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
const filename = resolve(directory, `seine-studio-${stamp}.json`);

await mkdir(directory, { recursive: true, mode: 0o700 });
await writeFile(filename, `${JSON.stringify(bundle, null, 2)}\n`, { mode: 0o600 });

console.log(`Backup written: ${filename}`);
for (const table of bundle.manifest.tables) console.log(`  ${table.name}: ${table.rowCount} rows`);
