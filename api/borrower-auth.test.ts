import { beforeEach, expect, it, vi } from "vitest";
import { Hono } from "hono";
import { MySqlDialect } from "drizzle-orm/mysql-core";
const fake = vi.hoisted(() => ({
  rows: [] as unknown[],
  inserted: [] as unknown[],
  condition: undefined as unknown,
}));
vi.mock("./queries/connection", () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => fake.rows }),
        innerJoin: () => ({
          where: (condition: unknown) => {
            fake.condition = condition;
            return { limit: async () => fake.rows };
          },
        }),
      }),
    }),
    insert: () => ({
      values: async (value: unknown) => {
        fake.inserted.push(value);
      },
    }),
  }),
}));
import { borrowerAuthHandler, getBorrower } from "./borrower-auth";
import { passwordHash, digest } from "./borrower-security";
const app = new Hono();
app.post("/login", c => borrowerAuthHandler(c, false));
beforeEach(() => {
  fake.rows = [];
  fake.inserted = [];
  fake.condition = undefined;
});
it("rejects login CSRF before any database work", async () => {
  const response = await app.request("https://example.test/login", {
    method: "POST",
    headers: {
      origin: "https://attacker.test",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  expect(response.status).toBe(403);
  expect(fake.inserted).toHaveLength(0);
});
it("issues an HttpOnly same-site cookie and stores only its hash", async () => {
  fake.rows = [
    {
      id: 91,
      phone: "256700000091",
      passwordHash: await passwordHash("synthetic-password-91"),
    },
  ];
  const response = await app.request("https://example.test/login", {
    method: "POST",
    headers: {
      origin: "https://example.test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone: "0700000091",
      password: "synthetic-password-91",
    }),
  });
  expect(response.status).toBe(200);
  const cookie = response.headers.get("set-cookie")!;
  expect(cookie).toContain("HttpOnly");
  expect(cookie).toContain("SameSite=Strict");
  const token = cookie.match(/ql_borrower=([^;]+)/)![1];
  expect(fake.inserted).toEqual([
    expect.objectContaining({ tokenHash: digest(token), borrowerId: 91 }),
  ]);
  expect(JSON.stringify(fake.inserted)).not.toContain(token);
});
it("does not create a session for an incorrect password", async () => {
  fake.rows = [
    {
      id: 92,
      phone: "256700000092",
      passwordHash: await passwordHash("synthetic-password-92"),
    },
  ];
  const response = await app.request("https://example.test/login", {
    method: "POST",
    headers: {
      origin: "https://example.test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone: "0700000092",
      password: "incorrect-password",
    }),
  });
  expect(response.status).toBe(401);
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(fake.inserted).toHaveLength(0);
});
it("session lookup checks the token hash and server-side expiry", async () => {
  await getBorrower(
    new Request("https://example.test/me", {
      headers: { cookie: "ql_borrower=synthetic-session-token" },
    })
  );
  const query = new MySqlDialect().sqlToQuery(
    fake.condition as Parameters<MySqlDialect["sqlToQuery"]>[0]
  );
  expect(query.params[0]).toBe(digest("synthetic-session-token"));
  expect(query.sql).toContain("`expiresAt` > ?");
  expect(query.params[1]).toBeTruthy();
});
