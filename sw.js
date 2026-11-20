// Offline support. Everything the app needs is cached on first visit and
// served from the cache, so it works with no connection.
// Bump CACHE on every change: the phone then installs the new version the
// next time the app is opened online, and the page reloads itself once.
// The name starts with "dawnline-" because all the owner's apps share one
// web address and its browser storage.
const CACHE = "dawnline-v2";

const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/app.css",
  "js/app.js",
  "js/astro.js",
  "js/prayer.js",
  "js/tz.js",
  "js/scale.js",
  "js/graph.js",
  "js/sky.js",
  "js/geo.js",
  "js/map.js",
  "js/data/methods.js",
  "js/data/timezones.js",
  "js/data/explain.js",
  "data/world.json",
  "data/places.json",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("dawnline-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL("./", self.location).pathname)) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (e) {
        if (req.mode === "navigate") return (await cache.match("index.html")) || Response.error();
        throw e;
      }
    })
  );
});
