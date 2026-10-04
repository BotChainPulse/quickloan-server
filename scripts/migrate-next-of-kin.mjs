import "dotenv/config";
import { createConnection } from "mysql2/promise";

let connection;
try {
  const uri = process.env.DATABASE_URL;
  if (!uri || new URL(uri).protocol !== "mysql:") throw new Error("A MySQL/TiDB DATABASE_URL is required");
  connection = await createConnection({ uri,
    ...(process.env.DATABASE_SSL === "true" ? { ssl: { rejectUnauthorized: true } } : {}),
  });
  const [columns] = await connection.query("SHOW COLUMNS FROM `applications`");
  const existing = new Set(columns.map((column) => column.Field));
  // Fixed identifiers only; no caller-provided SQL or application data is read.
  const additions = [["kinName2", "varchar(255)"], ["kinPhone2", "varchar(20)"], ["kinName3", "varchar(255)"], ["kinPhone3", "varchar(20)"]]
    .filter(([name]) => !existing.has(name))
    .map(([name, type]) => `ADD COLUMN \`${name}\` ${type} NULL`);
  if (additions.length) await connection.query(`ALTER TABLE \`applications\` ${additions.join(", ")}`);
  console.log(`Next-of-kin schema ready; added ${additions.length} columns. No application rows were changed.`);
} catch {
  console.error("Next-of-kin migration failed. Check schema access and connection settings; credentials are not logged.");
  process.exitCode = 1;
} finally { if (connection) await connection.end(); }
