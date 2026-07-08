(() => {
  const KEY = "beauty-crm-v10";
  const DEFAULT_SHORTCUTS = [
    { id: "SC001", title: "前台預約", icon: "約", targetType: "go", target: "front", sort: 10, active: true },
    { id: "SC002", title: "貼上預約", icon: "貼", targetType: "go", target: "paste", sort: 20, active: true },
    { id: "SC003", title: "後台評估", icon: "評", targetType: "go", target: "eval", sort: 30, active: true },
    { id: "SC004", title: "現場預約", icon: "現", targetType: "go", target: "site", sort: 40, active: true },
    { id: "SC005", title: "訂單管理", icon: "單", targetType: "go", target: "orders", sort: 50, active: true },
    { id: "SC006", title: "行事曆", icon: "曆", targetType: "go", target: "calendar", sort: 60, active: true },
    { id: "SC007", title: "客戶資料", icon: "客", targetType: "go", target: "customers", sort: 70, active: true },
    { id: "SC008", title: "價目菜單", icon: "價", targetType: "ext", target: "publicMenu", sort: 80, active: true },
    { id: "SC009", title: "我的預約", icon: "我", targetType: "ext", target: "memberReservations", sort: 90, active: true },
    { id: "SC010", title: "員工打卡", icon: "卡", targetType: "url", target: "./employee-mobile/", sort: 100, active: true },
    { id: "SC011", title: "人資管理", icon: "人", targetType: "admin", target: "hr", sort: 105, active: true },
    { id: "SC012", title: "財務管理", icon: "財", targetType: "admin", target: "finance", sort: 106, active: true },
    { id: "SC013", title: "庫存管理", icon: "庫", targetType: "admin", target: "operation", sort: 107, active: true },
    { id: "SC014", title: "權限管理", icon: "權", targetType: "admin", target: "rbac", sort: 108, active: true }
  ];
  const TARGETS = [
    { label: "前台預約", type: "go", target: "front" },
    { label: "貼上預約", type: "go", target: "paste" },
    { label: "後台評估", type: "go", target: "eval" },
    { label: "現場預約", type: "go", target: "site" },
    { label: "訂單管理", type: "go", target: "orders" },
    { label: "行事曆", type: "go", target: "calendar" },
    { label: "客戶資料", type: "go", target: "customers" },
    { label: "管理後台", type: "go", target: "adminLogin" },
    { label: "價目菜單", type: "ext", target: "publicMenu" },
    { label: "我的預約", type: "ext", target: "memberReservations" },
    { label: "菜單管理", type: "ext", target: "menuAdmin" },
    { label: "取消/改期管理", type: "ext", target: "cancelAdmin" },
    { label: "品牌設定", type: "brand", target: "settings" },
    { label: "員工打卡", type: "url", target: "./employee-mobile/" },
    { label: "權限管理", type: "admin", target: "rbac" },
    { label: "人資管理", type: "admin", target: "hr" },
    { label: "財務管理", type: "admin", target: "finance" },
    { label: "庫存管理", type: "admin", target: "operation" },
    { label: "系統日誌", type: "admin", target: "logs" }
  ];

  function db() {
    const data = window.db || {};
    data.shortcuts ||= DEFAULT_SHORTCUTS.map((item) => ({ ...item }));
    DEFAULT_SHORTCUTS.forEach((item) => {
      if (!data.shortcuts.some((row) => row.targetType === item.targetType && row.target === item.target)) {
        data.shortcuts.push({ ...item, id: `${item.id}_${Date.now()}` });
      }
    });
    window.db = data;
    return data;
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(db())); }
  function el(id) { return document.getElementById(id); }
  function value(id) { return (el(id)?.value || "").trim(); }
  function esc(v) { return String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function field(label, id, val = "", type = "text") { return `<div class="field"><label>${label}</label><input id="${id}" type="${type}" value="${esc(val)}"></div>`; }
  function select(label, id, items, selected = "") {
    return `<div class="field"><label>${label}</label><select id="${id}">${items.map((item) => {
      const text = typeof item === "string" ? item : item.label;
      const val = typeof item === "string" ? item : `${item.type}|${item.target}`;
      return `<option value="${esc(val)}" ${String(val) === String(selected) ? "selected" : ""}>${esc(text)}</option>`;
    }).join("")}</select></div>`;
  }
  function shortcutAttrs(item) {
    if (item.targetType === "go") return `data-go="${esc(item.target)}"`;
    if (item.targetType === "admin") return `data-admin-module="${esc(item.target)}"`;
    if (item.targetType === "url") return `data-shortcut-url="${esc(item.target)}"`;
    if (item.targetType === "brand") return `data-brand-open="1"`;
    return `data-menu-action="${esc(item.target)}"`;
  }
  function shortcutButton(item) {
    return `<button ${shortcutAttrs(item)}><span>${esc(item.icon || "功")}</span><b>${esc(item.title)}</b><small>${esc(labelFor(item))}</small></button>`;
  }
  function labelFor(item) {
    if (item.targetType === "admin") return "後台模組";
    if (item.targetType === "url") return "獨立頁面";
    if (item.targetType === "go") return "系統頁面";
    return "功能入口";
  }
  function renderGrid() {
    if (window.screenLayoutManager) return;
    const grid = document.querySelector(".tool-grid");
    if (!grid || grid.dataset.shortcutEnhanced) return;
    grid.dataset.shortcutEnhanced = "1";
    const shortcuts = db().shortcuts.filter((x) => x.active !== false).sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
    grid.innerHTML = shortcuts.map(shortcutButton).join("");
  }
  function settingsPage() {
    const data = db();
    const rows = data.shortcuts.slice().sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0)).map((item) => `
      <tr>
        <td><input data-shortcut-field="title" data-id="${esc(item.id)}" value="${esc(item.title)}"></td>
        <td><input data-shortcut-field="icon" data-id="${esc(item.id)}" value="${esc(item.icon)}"></td>
        <td><input data-shortcut-field="sort" data-id="${esc(item.id)}" type="number" value="${esc(item.sort)}"></td>
        <td>${esc(labelFor(item))}</td>
        <td><label class="switch"><input data-shortcut-field="active" data-id="${esc(item.id)}" type="checkbox" ${item.active !== false ? "checked" : ""}><span></span></label></td>
        <td><button class="warn" data-shortcut-delete="${esc(item.id)}">刪除</button></td>
      </tr>`).join("");
    el("app").innerHTML = `<header class="topbar worktop"><div><h1>快捷入口管理</h1><small>可以自己新增功能按鈕、換名稱、換圖示字、調整排序</small></div><button data-go="adminHome" class="ghost">回後台</button></header>
      <main class="page">
        <section class="card"><h2>新增功能按鈕</h2>
          <div class="grid four">${field("按鈕名稱", "shortcutTitle")}${field("圖示字", "shortcutIcon", "功")}${field("排序", "shortcutSort", "10", "number")}${select("連到哪裡", "shortcutTarget", TARGETS)}</div>
          <button data-shortcut-add>新增按鈕</button>
        </section>
        <section class="table-wrap"><table><thead><tr><th>名稱</th><th>圖示</th><th>排序</th><th>類型</th><th>顯示</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table></section>
      </main>`;
  }
  function addShortcut() {
    const [targetType, target] = value("shortcutTarget").split("|");
    db().shortcuts.push({ id: `SC${Date.now()}`, title: value("shortcutTitle") || "新功能", icon: value("shortcutIcon") || "功", targetType, target, sort: Number(value("shortcutSort") || 99), active: true });
    save();
    settingsPage();
  }
  document.addEventListener("click", (event) => {
    const url = event.target.closest("[data-shortcut-url]");
    if (url) location.href = url.dataset.shortcutUrl;
    if (event.target.closest("[data-shortcut-settings]")) settingsPage();
    if (event.target.closest("[data-shortcut-add]")) addShortcut();
    const del = event.target.closest("[data-shortcut-delete]");
    if (del && confirm("確定刪除這個快捷按鈕？")) {
      db().shortcuts = db().shortcuts.filter((x) => x.id !== del.dataset.shortcutDelete);
      save();
      settingsPage();
    }
  });
  document.addEventListener("input", (event) => {
    const fieldInput = event.target.closest("[data-shortcut-field]");
    if (!fieldInput) return;
    const item = db().shortcuts.find((x) => x.id === fieldInput.dataset.id);
    if (!item) return;
    if (fieldInput.dataset.shortcutField === "active") item.active = fieldInput.checked;
    else if (fieldInput.dataset.shortcutField === "sort") item.sort = Number(fieldInput.value || 0);
    else item[fieldInput.dataset.shortcutField] = fieldInput.value;
    save();
  });
  document.addEventListener("DOMContentLoaded", renderGrid);
  window.addEventListener("ui:stabilize", renderGrid);
  window.shortcutManager = { settingsPage, renderGrid };
})();
