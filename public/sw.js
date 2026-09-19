// ─────────────────────────────────────────────────────────────
// Tabla de Verbos service worker — offline app shell.
//
// The app is fully static (no API routes, no database — every
// request is an asset), so the cache covers the entire app.
//
// Strategy:
//   navigation (/)      network-first → cached shell → offline page
//   immutable assets    cache-first (hashed media, icons, svg)
//   other static        network-first → cache fallback — dev-safe:
//                       dev CSS/JS chunks keep a stable (non-hashed)
//                       URL, so cache-first would serve stale styles
//                       forever; network-first still works offline
//                       via the fallback
// Bump CACHE on shell changes — old caches purge on activate.
// ─────────────────────────────────────────────────────────────

const CACHE = "tdv-shell-v3";

/** truly immutable, safe to serve without revalidation */
const IMMUTABLE = [
  /\/_next\/static\/media\//, // hashed fonts
  /^\/icons\//,
  /^\/(icon|logo)\.svg$/,
  /^\/manifest\.webmanifest$/,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // pre-cache the shell best-effort — a missing asset never
      // blocks installation
      await Promise.allSettled(
        ["/", "/manifest.webmanifest", "/icon.svg", "/logo.svg"].map((url) =>
          cache.add(new Request(url, { cache: "reload" }))
        )
      );
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === "/sw.js") return; // never intercept the SW itself

  // app shell navigations — network-first with cached fallback
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put("/", fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match("/");
          if (cached) return cached;
          return new Response(
            "<!doctype html><title>Tabla de Verbos</title><p style=\"font-family:serif;padding:2rem\">Offline — reload once connected.</p>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }
      })()
    );
    return;
  }

  // immutable assets — cache-first (hashed / never changing)
  if (IMMUTABLE.some((re) => re.test(url.pathname))) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh.ok) {
            const cache = await caches.open(CACHE);
            cache.put(request, fresh.clone());
          }
          return fresh;
        } catch {
          return new Response("", { status: 504 });
        }
      })()
    );
    return;
  }

  // other static (dev chunks) — network-first, cache fallback
  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        if (fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(request, fresh.clone());
        }
        return fresh;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response("", { status: 504 });
      }
    })()
  );
});
