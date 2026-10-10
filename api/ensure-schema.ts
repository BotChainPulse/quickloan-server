import mysql from "mysql2/promise";
import { env } from "./lib/env";

const additions = [
  ["kin2Name", "VARCHAR(255) NULL"],
  ["kin2Phone", "VARCHAR(20) NULL"],
  ["kin3Name", "VARCHAR(255) NULL"],
  ["kin3Phone", "VARCHAR(20) NULL"],
  ["borrowerTokenHash", "VARCHAR(64) NULL"],
  ["borrowerId", "BIGINT UNSIGNED NULL"],
  ["confidentialPayload", "LONGTEXT NULL"],
  ["consentVersion", "VARCHAR(32) NULL"],
] as const;

export async function ensureQuickLoanSchema() {
  const connection = await mysql.createConnection(env.databaseUrl);
  try {
    await connection.query(`CREATE TABLE IF NOT EXISTS borrower_accounts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      phone VARCHAR(20) NOT NULL UNIQUE, passwordHash VARCHAR(255) NOT NULL,
      phoneVerified INT NOT NULL DEFAULT 0, createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    await connection.query(`CREATE TABLE IF NOT EXISTS borrower_sessions (
      tokenHash VARCHAR(64) NOT NULL PRIMARY KEY, borrowerId BIGINT UNSIGNED NOT NULL,
      expiresAt TIMESTAMP NOT NULL, INDEX borrower_sessions_owner (borrowerId))`);
    await connection.query(`CREATE TABLE IF NOT EXISTS borrower_requests (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, borrowerId BIGINT UNSIGNED NOT NULL UNIQUE,
      type VARCHAR(32) NOT NULL, status VARCHAR(32) NOT NULL DEFAULT 'pending', createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
    const [notificationColumns] = await connection.query(
      "SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'borrowerId'"
    );
    if (!Number((notificationColumns as Array<{ count: number }>)[0]?.count))
      await connection.query(
        "ALTER TABLE notifications ADD COLUMN borrowerId BIGINT UNSIGNED NULL"
      );
    for (const [column, definition] of additions) {
      const [rows] = await connection.query(
        "SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications' AND COLUMN_NAME = ?",
        [column]
      );
      const count = Number((rows as Array<{ count: number }>)[0]?.count ?? 0);
      if (!count)
        await connection.query(
          `ALTER TABLE applications ADD COLUMN \`${column}\` ${definition}`
        );
    }
  } finally {
    await connection.end();
  }
}
