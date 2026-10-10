const CACHE = "quickloan-public-v2";
self.addEventListener("install", event =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then(cache =>
        cache.addAll([
          "/offline.html",
          "/manifest.webmanifest",
          "/quickloan-192.png",
          "/quickloan-512.png",
        ])
      )
      .then(() => self.skipWaiting())
  )
);
self.addEventListener("activate", event =>
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith("quickloan-") && key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
);
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (
    url.origin !== self.location.origin ||
    event.request.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin")
  )
    return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/offline.html"))
    );
    return;
  }
  if (
    !url.pathname.startsWith("/assets/") &&
    ![
      "/manifest.webmanifest",
      "/quickloan-192.png",
      "/quickloan-512.png",
    ].includes(url.pathname)
  )
    return;
  event.respondWith(
    caches.match(event.request).then(
      hit =>
        hit ||
        fetch(event.request).then(response => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
    )
  );
});
