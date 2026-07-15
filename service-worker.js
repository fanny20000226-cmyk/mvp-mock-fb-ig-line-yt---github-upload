const CACHE = "car-beauty-pwa-v67";
const ASSETS = [
  "./",
  "./index.html",
  "./reset.html",
  "./manifest.json",
  "./icons/icon.svg",
  "./styles-v7.css?v=2",
  "./password-hide.css?v=1",
  "./menu-reservation.css?v=2",
  "./brand-manager.css?v=1",
  "./shortcut-manager.css?v=1",
  "./screen-layout-manager.css?v=6",
  "./finance-reconciliation.css?v=2",
  "./module-permission-dashboard.css?v=5",
  "./quote-export.css?v=17",
  "./theme-black-gold.css?v=2",
  "./quote-car-floorplan.jpg?v=2",
  "./quote-seat-guide.jpg?v=2",
  "./app-v10.js?v=5",
  "./ui-stability-guard.js?v=1",
  "./paste-auto.js?v=1",
  "./eval-paste.js?v=2",
  "./menu-reservation.js?v=4",
  "./role-manager.js?v=2",
  "./brand-manager.js?v=4",
  "./admin-modules.js?v=3",
  "./shortcut-manager.js?v=8",
  "./screen-layout-manager.js?v=10",
  "./finance-reconciliation.js?v=3",
  "./module-permission-dashboard.js?v=10",
  "./quote-export.js?v=15",
  "./theme-sidebar.js?v=1",
  "./pwa-init.js?v=33",
  "./employee-mobile/",
  "./employee-mobile/index.html",
  "./employee-mobile/style.css",
  "./employee-mobile/employee-app.js?v=2"
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

  const url = new URL(event.request.url);
  const accept = event.request.headers.get("accept") || "";
  const forceFresh = url.searchParams.has("fresh") || url.searchParams.has("reset") || url.searchParams.has("nocache");
  const isPage = event.request.mode === "navigate" || accept.includes("text/html");

  if (forceFresh || isPage) {
    event.respondWith(
      fetch(new Request(event.request, { cache: "reload" }))
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
  );
});
