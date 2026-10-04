import { afterEach, describe, expect, it, vi } from "vitest";
import { authConfig, ownsPhone, isLender, sameOrigin, verifyManagedToken } from "./managed-auth";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("pilot access controls", () => {
  const borrower = { id: "borrower", phone: "+256700000001", phone_confirmed_at: "2026-10-04" };
  it("requires verified ownership, accepting equivalent Uganda format", () => {
    expect(ownsPhone(undefined, "0700000001")).toBe(false);
    expect(ownsPhone({ ...borrower, phone_confirmed_at: undefined }, "0700000001")).toBe(false);
    expect(ownsPhone(borrower, "0700000001")).toBe(true);
    expect(ownsPhone(borrower, "+256700000002")).toBe(false);
  });
  it("requires server allowlist AND MFA, never a client role", () => {
    vi.stubEnv("LENDER_SUPABASE_USER_IDS", "owner");
    expect(isLender({ id: "owner", aal: "aal1" })).toBe(false);
    expect(isLender({ id: "attacker", aal: "aal2" })).toBe(false);
    expect(isLender({ id: "owner", aal: "aal2" })).toBe(true);
  });
  it("denies foreign or missing origins", () => {
    vi.stubEnv("APP_URL", "https://quickloan.example");
    expect(sameOrigin(new Request("https://internal/api"))).toBe(false);
    expect(sameOrigin(new Request("https://internal/api", { headers: { origin: "https://evil.example" } }))).toBe(false);
    expect(sameOrigin(new Request("https://internal/api", { headers: { origin: "https://quickloan.example" } }))).toBe(true);
  });
  it("does not expose service-role keys", () => {
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_secret_not-public");
    expect(authConfig()).toBeNull();
  });
  it("fails closed without configuration or on Auth outage", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    expect(await verifyManagedToken("fake")).toBeUndefined();
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("outage")));
    expect(await verifyManagedToken("fake")).toBeUndefined();
  });
});
