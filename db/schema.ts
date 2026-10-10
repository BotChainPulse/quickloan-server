import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  longtext,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here. See docs/Database.md for schema examples and patterns.
//
// Example:
// export const posts = mysqlTable("posts", {
//   id: serial("id").primaryKey(),
//   title: varchar("title", { length: 255 }).notNull(),
//   content: text("content"),
//   createdAt: timestamp("created_at").notNull().defaultNow(),
// });
//
// Note: FK columns referencing a serial() PK must use:
//   bigint("columnName", { mode: "number", unsigned: true }).notNull()

// ── QuickLoan Phase B ──────────────────────────────────────────────
export const applications = mysqlTable("applications", {
  id: serial("id").primaryKey(),
  ref: varchar("ref", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  dob: varchar("dob", { length: 20 }),
  nin: varchar("nin", { length: 20 }),
  gender: varchar("gender", { length: 10 }),
  district: varchar("district", { length: 100 }),
  occupation: varchar("occupation", { length: 50 }),
  income: varchar("income", { length: 50 }),
  amount: bigint("amount", { mode: "number" }).notNull(),
  durationWeeks: int("durationWeeks").notNull(),
  purpose: varchar("purpose", { length: 50 }),
  kinName: varchar("kinName", { length: 255 }),
  kinPhone: varchar("kinPhone", { length: 20 }),
  kin2Name: varchar("kin2Name", { length: 255 }),
  kin2Phone: varchar("kin2Phone", { length: 20 }),
  kin3Name: varchar("kin3Name", { length: 255 }),
  kin3Phone: varchar("kin3Phone", { length: 20 }),
  borrowerId: bigint("borrowerId", { mode: "number", unsigned: true }),
  confidentialPayload: longtext("confidentialPayload"),
  consentVersion: varchar("consentVersion", { length: 32 }),
  borrowerTokenHash: varchar("borrowerTokenHash", { length: 64 }),
  signature: varchar("signature", { length: 255 }),
  idFrontPhoto: longtext("idFrontPhoto"),
  idBackPhoto: longtext("idBackPhoto"),
  livenessPhoto: longtext("livenessPhoto"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"])
    .default("pending")
    .notNull(),
  decisionNote: varchar("decisionNote", { length: 500 }),
  decidedAt: timestamp("decidedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  borrowerId: bigint("borrowerId", { mode: "number", unsigned: true }),
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const devices = mysqlTable("devices", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull(),
  fcmToken: varchar("fcmToken", { length: 512 }),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const borrowerAccounts = mysqlTable("borrower_accounts", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  phoneVerified: int("phoneVerified").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const borrowerSessions = mysqlTable("borrower_sessions", {
  tokenHash: varchar("tokenHash", { length: 64 }).primaryKey(),
  borrowerId: bigint("borrowerId", {
    mode: "number",
    unsigned: true,
  }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

export const borrowerRequests = mysqlTable("borrower_requests", {
  id: serial("id").primaryKey(),
  borrowerId: bigint("borrowerId", { mode: "number", unsigned: true })
    .notNull()
    .unique(),
  type: varchar("type", { length: 32 }).notNull(),
  status: varchar("status", { length: 32 }).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
