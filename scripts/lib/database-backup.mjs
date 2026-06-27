import { neon } from "@neondatabase/serverless";
import { BACKUP_TABLES, checksum, createBackupBundle } from "./backup-core.mjs";

const SCHEMA_QUERY = `
  select table_name, column_name, ordinal_position, data_type, udt_name,
         is_nullable, column_default
  from information_schema.columns
  where table_schema = 'public' and table_name = any($1::text[])
  order by table_name, ordinal_position
`;

const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;

export function createSql(connectionString) {
  if (!connectionString) throw new Error("A Postgres connection string is required");
  return neon(connectionString);
}

export async function readSchema(sql) {
  return sql.query(SCHEMA_QUERY, [BACKUP_TABLES]);
}

export async function createDatabaseBackup(sql, now = new Date()) {
  const results = await sql.transaction(
    (tx) => [
      tx.query("select current_database() as database, current_schema() as schema"),
      tx.query(SCHEMA_QUERY, [BACKUP_TABLES]),
      ...BACKUP_TABLES.map((table) => tx.query(`select * from public.${quoteIdentifier(table)} order by id`)),
    ],
    { isolationLevel: "Repeatable Read", readOnly: true },
  );
  const [sourceRows, schema, ...tableRows] = results;
  const rowsByTable = Object.fromEntries(BACKUP_TABLES.map((table, index) => [table, tableRows[index]]));

  return createBackupBundle({
    createdAt: now.toISOString(),
    source: sourceRows[0],
    schema,
    rowsByTable,
  });
}

export async function assertEmptyTarget(sql) {
  const counts = await Promise.all(
    BACKUP_TABLES.map(async (table) => {
      const rows = await sql.query(`select count(*)::int as count from public.${quoteIdentifier(table)}`);
      return { table, count: rows[0].count };
    }),
  );
  const populated = counts.filter(({ count }) => count > 0);
  if (populated.length) {
    throw new Error(
      `Restore target is not empty: ${populated.map(({ table, count }) => `${table} (${count})`).join(", ")}`,
    );
  }
}

export async function restoreDatabaseBackup(sql, bundle) {
  const queries = BACKUP_TABLES.map((table) => {
    const qualified = `public.${quoteIdentifier(table)}`;
    return sql.query(`insert into ${qualified} select * from json_populate_recordset(null::${qualified}, $1::json)`, [
      JSON.stringify(bundle.data[table]),
    ]);
  });
  await sql.transaction(queries);
}

export async function verifyRestoredDatabase(sql, bundle) {
  for (const table of BACKUP_TABLES) {
    const rows = await sql.query(`select * from public.${quoteIdentifier(table)} order by id`);
    const expected = bundle.manifest.tables.find((entry) => entry.name === table);
    if (rows.length !== expected.rowCount || checksum(rows) !== expected.sha256) {
      throw new Error(`Restored data verification failed for ${table}`);
    }
  }
}
