import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";
import { createPool } from "mysql2/promise";

const fullSchema = { ...schema, ...relations };

let instance: MySql2Database<typeof fullSchema>;

export function getDb() {
  if (!instance) {
    const url = new URL(env.databaseUrl);
    if (url.protocol !== "mysql:") throw new Error("QuickLoan currently requires MySQL/TiDB. PostgreSQL migration is not yet implemented.");
    const pool = createPool({ uri: env.databaseUrl, connectionLimit: 5,
      ...(process.env.DATABASE_SSL === "true" ? { ssl: { rejectUnauthorized: true } } : {}),
    });
    instance = drizzle(pool, {
      mode: "default",
      schema: fullSchema,
    });
  }
  return instance;
}
