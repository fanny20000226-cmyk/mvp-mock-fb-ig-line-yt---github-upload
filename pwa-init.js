(() => {
  const APP_VERSION = "v41";

  async function refreshOldAppCache() {
    const key = "beauty-crm-app-version";
    const reloadedKey = "beauty-crm-version-reloaded";
    const current = localStorage.getItem(key);
    if (current === APP_VERSION) return;
    localStorage.setItem(key, APP_VERSION);
    if (sessionStorage.getItem(reloadedKey) === APP_VERSION) return;
    sessionStorage.setItem(reloadedKey, APP_VERSION);
    try {
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
      }
      location.replace(`${location.pathname}?fresh=${APP_VERSION}`);
    } catch (error) {
      // If cache clearing is blocked, the app should still continue normally.
    }
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      refreshOldAppCache().finally(() => navigator.serviceWorker.register("./service-worker.js")).catch(() => {
        // Keep the app usable even if a private browser blocks service workers.
      });
    });
  }

  const params = new URLSearchParams(location.search);
  const shortcut = params.get("shortcut");
  if (shortcut === "admin") {
    setTimeout(() => window.go && window.go("adminLogin"), 120);
  }
  if (shortcut === "reserve") {
    setTimeout(() => window.go && window.go("front"), 120);
  }

  window.addEventListener("online", () => document.body.classList.remove("is-offline"));
  window.addEventListener("offline", () => document.body.classList.add("is-offline"));
  if (!navigator.onLine) document.body.classList.add("is-offline");
})();
