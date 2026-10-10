/* Only Go navigations use this fallback. App pages and private logs are not cached. */
const CACHE = "r3ai-go-offline-v1";
const OFFLINE = "/go/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("r3ai-go-offline-") && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.mode !== "navigate" || url.origin !== self.location.origin || !(url.pathname === "/go" || url.pathname.startsWith("/go/"))) return;
  event.respondWith(fetch(event.request).catch(async () => (await caches.match(OFFLINE)) || new Response("R3AI Go is offline. Reconnect and try again.", { status: 503 })));
});
