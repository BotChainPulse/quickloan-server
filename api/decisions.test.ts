import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./queries/connection", () => mocks);
import { quickloanRouter } from "./quickloan-router";
import type { User } from "@db/schema";
beforeEach(() => vi.stubEnv("APP_URL", "https://quickloan.example"));
afterEach(() => vi.unstubAllEnvs());
describe("review decisions", () => {
  const caller = () => quickloanRouter.createCaller({
    req: new Request("https://quickloan.example/api", { headers: { origin: "https://quickloan.example" } }),
    resHeaders: new Headers(), user: { role: "admin" } as User,
  });
  function database(status = "pending", affectedRows = 1) {
    const insert = vi.fn().mockResolvedValue(undefined);
    const tx = {
      query: { applications: { findFirst: vi.fn().mockResolvedValue({ id: 1, ref: "QL-test", status, phone: "synthetic", amount: 20000 }) } },
      update: () => ({ set: () => ({ where: vi.fn().mockResolvedValue([{ affectedRows }]) }) }),
      insert: () => ({ values: insert }),
    };
    const transaction = vi.fn((callback) => callback(tx));
    mocks.getDb.mockReturnValue({ transaction });
    return { insert, transaction };
  }
  it("writes the decision and notice inside a transaction without promising money", async () => {
    const db = database();
    expect(await caller().decide({ id: 1, approved: true, note: "Send money shortly" })).toMatchObject({ status: "approved" });
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(db.insert.mock.calls[0][0].body).toContain("no disbursement is enabled");
    expect(db.insert.mock.calls[0][0].body).not.toContain("Send money shortly");
  });
  it("rejects already decided applications without another notice", async () => {
    const db = database("approved");
    await expect(caller().decide({ id: 1, approved: false })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(db.insert).not.toHaveBeenCalled();
  });
  it("rejects concurrent decisions when the conditional update affects no row", async () => {
    const db = database("pending", 0);
    await expect(caller().decide({ id: 1, approved: true })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(db.insert).not.toHaveBeenCalled();
  });
});
