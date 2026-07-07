(() => {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
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
