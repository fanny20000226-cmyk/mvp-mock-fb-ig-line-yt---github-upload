(() => {
  let stabilizeTimer = 0;
  let originalGo = null;

  function dispatchStabilize() {
    window.dispatchEvent(new CustomEvent("ui:stabilize"));
  }

  function scheduleStabilize(delay = 80) {
    clearTimeout(stabilizeTimer);
    stabilizeTimer = setTimeout(dispatchStabilize, delay);
  }

  function wrapGo() {
    if (!window.go || window.go === originalGo) return;
    const currentGo = window.go;
    originalGo = function stableGo(view) {
      const result = currentGo(view);
      scheduleStabilize(40);
      scheduleStabilize(180);
      return result;
    };
    window.go = originalGo;
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    const now = Date.now();
    const lastClick = Number(button.dataset.lastClickAt || 0);
    if (now - lastClick < 320) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    button.dataset.lastClickAt = String(now);
    button.classList.add("is-clicking");
    setTimeout(() => button.classList.remove("is-clicking"), 260);
    scheduleStabilize(120);
  }, true);

  document.addEventListener("input", () => scheduleStabilize(180), true);
  document.addEventListener("change", () => scheduleStabilize(120), true);
  document.addEventListener("DOMContentLoaded", () => {
    wrapGo();
    scheduleStabilize(0);
    scheduleStabilize(160);
    setTimeout(wrapGo, 50);
    setTimeout(wrapGo, 300);
  });
  window.addEventListener("load", () => scheduleStabilize(80));
  window.scheduleUiStabilize = scheduleStabilize;
})();
