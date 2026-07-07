const CACHE = "car-beauty-pwa-v18";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon.svg",
  "./styles-v7.css?v=2",
  "./password-hide.css?v=1",
  "./menu-reservation.css?v=2",
  "./brand-manager.css?v=1",
  "./shortcut-manager.css?v=1",
  "./app-v10.js?v=1",
  "./paste-auto.js?v=1",
  "./menu-reservation.js?v=2",
  "./role-manager.js?v=1",
  "./brand-manager.js?v=2",
  "./shortcut-manager.js?v=1",
  "./pwa-init.js?v=1"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => key === CACHE ? null : caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
