import { beforeEach, describe, expect, it, vi } from "vitest";
import { MySqlDialect } from "drizzle-orm/mysql-core";
const mock = vi.hoisted(() => ({
  where: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
}));
vi.mock("./queries/connection", () => ({ getDb: () => mock }));
import { quickloanRouter } from "./quickloan-router";
const account = {
  id: 7,
  phone: "256700000007",
  verified: 0,
  tokenHash: "synthetic",
};
const context = (borrower = account) => ({
  req: new Request("https://example.test/api"),
  resHeaders: new Headers(),
  borrower,
});
beforeEach(() => {
  vi.clearAllMocks();
  mock.select.mockReturnValue({
    from: () => ({
      where: (condition: unknown) => {
        mock.where(condition);
        return {
          orderBy: () => Promise.resolve([]),
          limit: () => Promise.resolve([]),
        };
      },
    }),
  });
});
describe("borrower record isolation", () => {
  it("requires a borrower session; lender auth is not enough", async () => {
    const caller = quickloanRouter.createCaller({
      ...context(),
      borrower: undefined,
      user: { role: "admin" } as never,
    });
    await expect(caller.myApplications()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(mock.select).not.toHaveBeenCalled();
  });
  it("scopes applications by account ID rather than a supplied phone", async () => {
    await quickloanRouter.createCaller(context()).myApplications();
    const query = new MySqlDialect().sqlToQuery(mock.where.mock.calls[0][0]);
    expect(query.sql).toContain("`borrowerId` = ?");
    expect(query.params).toEqual([7]);
    expect(query.params).not.toContain(account.phone);
  });
  it("scopes notifications to the same account", async () => {
    await quickloanRouter.createCaller(context()).myNotifications();
    const query = new MySqlDialect().sqlToQuery(mock.where.mock.calls[0][0]);
    expect(query.params).toEqual([7]);
    expect(query.sql).toContain("`notifications`.`borrowerId`");
  });
  it("does not disclose lender records to a borrower", async () => {
    await expect(
      quickloanRouter.createCaller(context()).listApplications()
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mock.select).not.toHaveBeenCalled();
  });
  it("blocks approval server-side even for the administrator", async () => {
    await expect(
      quickloanRouter
        .createCaller({ ...context(), user: { role: "admin" } as never })
        .decide({ id: 1, approved: true })
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(mock.insert).not.toHaveBeenCalled();
  });
});
