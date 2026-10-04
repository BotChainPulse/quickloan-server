/* Cache public installation assets only. Never cache accounts, IDs or API data. */
const CACHE = "quickloan-public-v1";
const PUBLIC_ASSETS = ["/offline.html", "/manifest.webmanifest", "/icons/quickloan-192.png", "/icons/quickloan-512.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(
    PUBLIC_ASSETS.map((path) => new Request(new URL(path, self.location.origin), { credentials: "omit", cache: "reload" })),
  )));
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith("quickloan-public-") && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.search || request.headers.has("authorization")) return;
  if (PUBLIC_ASSETS.includes(url.pathname)) {
    event.respondWith(caches.open(CACHE).then(async (cache) => (await cache.match(url.pathname)) ?? fetch(request)));
  } else if (request.mode === "navigate" && url.pathname === "/") {
    // Online HTML is never cached; offline fallback is a standalone public page.
    event.respondWith(fetch(request).catch(async () =>
      (await caches.open(CACHE)).match("/offline.html").then((response) => response ?? Response.error()),
    ));
  }
  // /login, /dashboard, /api/* and every other path remain network-only.
});
