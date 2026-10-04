import { describe, expect, it, vi, afterEach } from "vitest";
vi.mock("./queries/connection", () => ({ getDb: vi.fn(() => { throw new Error("Database must not be reached"); }) }));
import { quickloanRouter } from "./quickloan-router";

afterEach(() => vi.clearAllMocks());
describe("borrower API fails closed", () => {
  const req = new Request("https://quickloan.example/api/trpc");
  it("rejects all phone-only reads and writes before accessing data", async () => {
    const caller = quickloanRouter.createCaller({ req, resHeaders: new Headers() });
    for (const method of [caller.myApplications, caller.myNotifications, caller.unreadCount, caller.markRead]) {
      await expect(method({ phone: "0700000001" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
  });
  it("rejects another person's phone", async () => {
    const caller = quickloanRouter.createCaller({ req, resHeaders: new Headers(), borrower: { id: "b", phone: "+256700000001", phone_confirmed_at: "2026-10-04" } });
    await expect(caller.myApplications({ phone: "0700000002" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("does not accept new applications even for verified borrowers", async () => {
    const caller = quickloanRouter.createCaller({ req, resHeaders: new Headers(), borrower: { id: "b", phone: "+256700000001", phone_confirmed_at: "2026-10-04" } });
    await expect(caller.submit({ phone: "0700000001", name: "Test only", amount: 20000, durationWeeks: 2 })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
});
