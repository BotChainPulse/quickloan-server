import { describe, expect, it, vi, afterEach } from "vitest";
import app from "./boot";
afterEach(() => vi.unstubAllEnvs());
describe("HTTP pilot surfaces", () => {
  it("reports pilot status without claiming database or payment readiness", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ mode: "pilot", lendingEnabled: false });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects legacy PIN login", async () => {
    vi.stubEnv("APP_URL", "http://localhost");
    const res = await app.request("/api/lender-login", { method: "POST", headers: { origin: "http://localhost", "Content-Type": "application/json" }, body: JSON.stringify({ pin: "synthetic-only" }) });
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });
  it("removes obsolete OAuth callback and refuses foreign login", async () => {
    expect((await app.request("/api/oauth/callback")).status).toBe(404);
    expect((await app.request("/api/lender-login", { method: "POST", headers: { origin: "https://foreign.example" } })).status).toBe(403);
  });
});
