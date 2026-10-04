import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const cache = { match: vi.fn().mockResolvedValue(new Response("public offline page")), addAll: vi.fn().mockResolvedValue(undefined) };
  const caches = { open: vi.fn().mockResolvedValue(cache), keys: vi.fn().mockResolvedValue(["unrelated-cache", "quickloan-public-v0"]), delete: vi.fn().mockResolvedValue(true) };
  const fetch = vi.fn().mockResolvedValue(new Response("online"));
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: { location: { origin: "https://quickloan.example" }, clients: { claim: vi.fn() }, addEventListener: (name: string, fn: any) => handlers[name] = fn },
    caches, fetch, URL, Request, Response,
  });
  return { handlers, cache, caches, fetch };
}

describe("PWA privacy boundaries", () => {
  it("never intercepts private paths, API, writes, cross-origin or token URLs", () => {
    const { handlers } = worker();
    const respondWith = vi.fn();
    const cases = [
      { url: "https://quickloan.example/api/trpc/quickloan.myApplications", method: "GET" },
      { url: "https://quickloan.example/dashboard", method: "GET", mode: "navigate" },
      { url: "https://quickloan.example/login", method: "GET", mode: "navigate" },
      { url: "https://quickloan.example/", method: "POST" },
      { url: "https://other.example/offline.html", method: "GET" },
      { url: "https://quickloan.example/?token=synthetic", method: "GET", mode: "navigate" },
      { url: "https://quickloan.example/offline.html", method: "GET", headers: new Headers({ authorization: "Bearer synthetic" }) },
    ];
    for (const test of cases) handlers.fetch({ request: { ...test, headers: test.headers ?? new Headers() }, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });
  it("precaches only public assets with credentials omitted", async () => {
    const w = worker(); let work: Promise<unknown> | undefined;
    w.handlers.install({ waitUntil: (promise: Promise<unknown>) => work = promise });
    await work;
    const requests = w.cache.addAll.mock.calls[0][0] as Request[];
    expect(requests).toHaveLength(5);
    expect(requests.every((r) => r.credentials === "omit" && !r.url.includes("/api/") && !r.url.includes("/dashboard"))).toBe(true);
  });
  it("uses the public offline page for root navigation only", async () => {
    const w = worker(); w.fetch.mockRejectedValue(new Error("offline"));
    let response: Promise<Response> | undefined;
    w.handlers.fetch({ request: { url: "https://quickloan.example/", method: "GET", mode: "navigate", headers: new Headers() }, respondWith: (promise: Promise<Response>) => response = promise });
    expect(await (await response!).text()).toBe("public offline page");
    expect(w.cache.match).toHaveBeenCalledWith("/offline.html");
  });
  it("removes only this app's obsolete public caches", async () => {
    const w = worker(); let work: Promise<unknown> | undefined;
    w.handlers.activate({ waitUntil: (promise: Promise<unknown>) => work = promise });
    await work;
    expect(w.caches.delete).toHaveBeenCalledExactlyOnceWith("quickloan-public-v0");
  });
  it("has standalone manifest and correctly sized PNG icons", () => {
    const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
    expect(manifest).toMatchObject({ start_url: "/", scope: "/", display: "standalone" });
    for (const icon of manifest.icons) {
      const png = readFileSync(`public${icon.src}`);
      const [width, height] = icon.sizes.split("x").map(Number);
      expect(png.readUInt32BE(16)).toBe(width);
      expect(png.readUInt32BE(20)).toBe(height);
    }
  });
});
