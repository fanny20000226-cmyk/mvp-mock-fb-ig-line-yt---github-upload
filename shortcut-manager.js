(() => {
  const KEY = "beauty-crm-v10";
  const DEFAULT_SHORTCUTS = [
    { id: "SC001", title: "前台預約", icon: "前", targetType: "go", target: "front", sort: 10, active: true },
    { id: "SC002", title: "貼上填單", icon: "貼", targetType: "go", target: "paste", sort: 20, active: true },
    { id: "SC003", title: "後台評估", icon: "後", targetType: "go", target: "eval", sort: 30, active: true },
    { id: "SC004", title: "現場預約", icon: "現", targetType: "go", target: "site", sort: 40, active: true },
    { id: "SC005", title: "訂單管理", icon: "訂", targetType: "go", target: "orders", sort: 50, active: true },
    { id: "SC006", title: "行事曆", icon: "行", targetType: "go", target: "calendar", sort: 60, active: true },
    { id: "SC007", title: "客戶資料", icon: "客", targetType: "go", target: "customers", sort: 70, active: true },
    { id: "SC008", title: "圖片菜單", icon: "菜", targetType: "ext", target: "publicMenu", sort: 80, active: true },
    { id: "SC009", title: "我的預約", icon: "我", targetType: "ext", target: "memberReservations", sort: 90, active: true },
    { id: "SC010", title: "管理後台", icon: "管", targetType: "go", target: "adminLogin", sort: 100, active: true }
  ];
  const TARGETS = [
    { label: "前台預約", type: "go", target: "front" },
    { label: "貼上填單", type: "go", target: "paste" },
    { label: "後台評估", type: "go", target: "eval" },
    { label: "現場預約", type: "go", target: "site" },
    { label: "訂單管理", type: "go", target: "orders" },
    { label: "行事曆", type: "go", target: "calendar" },
    { label: "客戶資料", type: "go", target: "customers" },
    { label: "管理後台", type: "go", target: "adminLogin" },
    { label: "圖片菜單", type: "ext", target: "publicMenu" },
    { label: "我的預約", type: "ext", target: "memberReservations" },
    { label: "圖片菜單管理", type: "ext", target: "menuAdmin" },
    { label: "取消預約列表", type: "ext", target: "cancelAdmin" },
    { label: "品牌設定", type: "brand", target: "settings" },
    { label: "店長副店長", type: "role", target: "roleStaff" }
  ];

  function db() {
    const data = window.db || {};
    data.shortcuts = data.shortcuts || DEFAULT_SHORTCUTS.map((item) => ({ ...item }));
    return data;
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(db()));
  }

  function el(id) {
    return document.getElementById(id);
  }

  function value(id) {
    return (el(id)?.value || "").trim();
  }

  function esc(value) {
    return String(value || "").replace(/[&<>"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[char]));
  }

  function button(label, attrs = "", cls = "") {
    return `<button class="${cls}" ${attrs}>${label}</button>`;
  }

  function field(label, id, val = "", type = "text") {
    return `<div class="field"><label>${label}</label><input id="${id}" type="${type}" value="${esc(val)}"></div>`;
  }

  function select(label, id, items, selected = "") {
    return `<div class="field"><label>${label}</label><select id="${id}">${items.map((item) => {
      const value = typeof item === "string" ? item : item.value;
      const text = typeof item === "string" ? item : item.label;
      return `<option value="${esc(value)}" ${String(value) === String(selected) ? "selected" : ""}>${esc(text)}</option>`;
    }).join("")}</select></div>`;
  }

  function targetValue(item) {
    return `${item.targetType}:${item.target}`;
  }

  function splitTarget(value) {
    const [targetType, target] = String(value || "go:front").split(":");
    return { targetType, target };
  }

  function shortcutButton(item) {
    const attrs = item.targetType === "go"
      ? `data-go="${esc(item.target)}"`
      : item.targetType === "ext"
        ? `data-ext-go="${esc(item.target)}"`
        : item.targetType === "brand"
          ? `data-brand-go="${esc(item.target)}"`
          : `data-role-go="${esc(item.target)}"`;
    return `<button class="tool" ${attrs}><strong>${esc(item.icon || item.title.slice(0, 1))}</strong><span>${esc(item.title)}</span></button>`;
  }

  function applyShortcuts() {
    const data = db();
    const grid = document.querySelector(".page > .tool-grid");
    if (!grid || grid.dataset.shortcutManaged === "1") return;
    const title = document.querySelector(".topbar h1")?.textContent || "";
    if (!title.includes("工作台")) return;

    const items = data.shortcuts
      .filter((item) => item.active !== false)
      .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
    grid.dataset.shortcutManaged = "1";
    grid.innerHTML = items.map(shortcutButton).join("");
  }

  function shell(title, body) {
    if (!db().authed && window.go) return window.go("adminLogin");
    el("app").innerHTML = `<header class="topbar worktop">
      <div><h1>${title}</h1><small>管理後台 · 自訂功能與排序</small></div>
      ${button("回前台", 'data-go="home"', "ghost")}
    </header>
    <div class="admin-menu">
      ${button("總覽", 'data-go="adminHome"')}
      ${button("功能按鈕", 'data-shortcut-go="manager"')}
      ${button("圖片菜單管理", 'data-ext-go="menuAdmin"')}
      ${button("品牌設定", 'data-brand-go="settings"')}
      ${button("店長副店長", 'data-role-go="roleStaff"')}
    </div>
    <main class="page">${body}</main>`;
  }

  function manager(editId = "") {
    const data = db();
    const item = data.shortcuts.find((entry) => entry.id === editId) || {};
    const targetOptions = TARGETS.map((target) => ({
      value: `${target.type}:${target.target}`,
      label: target.label
    }));
    const selectedTarget = item.targetType ? targetValue(item) : "go:front";
    const rows = data.shortcuts.sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));

    shell("功能按鈕與排序", `<section class="card">
      <h2>${item.id ? "編輯功能按鈕" : "新增功能按鈕"}</h2>
      <input id="shortcutId" type="hidden" value="${esc(item.id || "")}">
      <section class="grid two">
        ${field("按鈕名稱", "shortcutTitle", item.title || "")}
        ${field("圖示文字", "shortcutIcon", item.icon || "")}
        ${select("點擊後開啟", "shortcutTarget", targetOptions, selectedTarget)}
        ${field("排序權重", "shortcutSort", item.sort || 10, "number")}
      </section>
      <label class="choice"><input id="shortcutActive" type="checkbox" ${item.active !== false ? "checked" : ""}> 顯示在首頁</label>
      <div class="row">
        ${button(item.id ? "儲存修改" : "新增按鈕", 'data-shortcut-action="save"', "gold")}
        ${button("清空", 'data-shortcut-go="manager"', "secondary")}
        ${button("恢復預設按鈕", 'data-shortcut-action="reset"', "secondary")}
      </div>
    </section>
    <section class="grid cards">${rows.map((entry) => `<article class="card shortcut-card ${entry.active === false ? "is-offline" : ""}">
      <div class="tool shortcut-preview"><strong>${esc(entry.icon || entry.title.slice(0, 1))}</strong><span>${esc(entry.title)}</span></div>
      <p class="muted">排序：${Number(entry.sort || 0)} / ${targetLabel(entry)}</p>
      <p>${entry.active === false ? '<span class="tag red">隱藏</span>' : '<span class="tag green">顯示</span>'}</p>
      <div class="row">
        ${button("編輯", `data-shortcut-edit="${entry.id}"`)}
        ${button(entry.active === false ? "顯示" : "隱藏", `data-shortcut-toggle="${entry.id}"`, "secondary")}
        ${button("刪除", `data-shortcut-delete="${entry.id}"`, "secondary")}
      </div>
    </article>`).join("")}</section>`);
  }

  function targetLabel(item) {
    return TARGETS.find((target) => target.type === item.targetType && target.target === item.target)?.label || item.target;
  }

  function saveShortcut() {
    const data = db();
    const oldId = value("shortcutId");
    const target = splitTarget(value("shortcutTarget"));
    const payload = {
      id: oldId || `SC${Date.now()}`,
      title: value("shortcutTitle") || "自訂功能",
      icon: (value("shortcutIcon") || value("shortcutTitle") || "功").slice(0, 2),
      targetType: target.targetType,
      target: target.target,
      sort: Number(value("shortcutSort") || 0),
      active: !!el("shortcutActive")?.checked
    };
    const index = data.shortcuts.findIndex((entry) => entry.id === oldId);
    if (index >= 0) data.shortcuts[index] = payload;
    else data.shortcuts.push(payload);
    save();
    manager();
  }

  function toggleShortcut(id) {
    const item = db().shortcuts.find((entry) => entry.id === id);
    if (!item) return;
    item.active = !item.active;
    save();
    manager();
  }

  function deleteShortcut(id) {
    const data = db();
    data.shortcuts = data.shortcuts.filter((entry) => entry.id !== id);
    save();
    manager();
  }

  function resetShortcuts() {
    db().shortcuts = DEFAULT_SHORTCUTS.map((item) => ({ ...item }));
    save();
    manager();
  }

  function enhance() {
    applyShortcuts();
    const menu = document.querySelector(".admin-menu");
    if (menu && !menu.querySelector('[data-shortcut-go="manager"]')) {
      menu.insertAdjacentHTML("afterbegin", '<button data-shortcut-go="manager">功能按鈕</button>');
    }
    const grid = document.querySelector(".tool-grid");
    if (grid && db().authed && !grid.querySelector('[data-shortcut-go="manager"]')) {
      grid.insertAdjacentHTML("beforeend", '<button class="tool" data-shortcut-go="manager"><strong>排</strong><span>功能排序</span></button>');
    }
  }

  document.addEventListener("click", (event) => {
    const route = event.target.closest("[data-shortcut-go]");
    if (route) {
      event.preventDefault();
      event.stopImmediatePropagation();
      manager();
      return;
    }

    const action = event.target.closest("[data-shortcut-action]");
    if (action) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (action.dataset.shortcutAction === "save") saveShortcut();
      if (action.dataset.shortcutAction === "reset") resetShortcuts();
      return;
    }

    const edit = event.target.closest("[data-shortcut-edit]");
    if (edit) {
      event.preventDefault();
      event.stopImmediatePropagation();
      manager(edit.dataset.shortcutEdit);
      return;
    }

    const toggle = event.target.closest("[data-shortcut-toggle]");
    if (toggle) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleShortcut(toggle.dataset.shortcutToggle);
      return;
    }

    const del = event.target.closest("[data-shortcut-delete]");
    if (del) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (confirm("確認刪除此功能按鈕？")) deleteShortcut(del.dataset.shortcutDelete);
    }
  }, true);

  new MutationObserver(enhance).observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(enhance, 100);
})();
