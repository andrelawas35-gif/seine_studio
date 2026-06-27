import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../../src/server/db/schema";

export function createDatabase(connectionString: string) {
  return drizzle(neon(connectionString), { schema });
}

export type Database = ReturnType<typeof createDatabase>;
