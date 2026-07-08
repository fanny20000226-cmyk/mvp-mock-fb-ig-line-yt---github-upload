(() => {
  const KEY = "beauty-crm-v10";
  const DEFAULT_ITEMS = [
    { id: "F001", zone: "front", title: "前台預約", icon: "預", targetType: "go", target: "front", sort: 10, active: true },
    { id: "F002", zone: "front", title: "貼上填單", icon: "貼", targetType: "go", target: "paste", sort: 20, active: true },
    { id: "F003", zone: "front", title: "圖片菜單", icon: "菜", targetType: "ext", target: "publicMenu", sort: 30, active: true },
    { id: "F004", zone: "front", title: "我的預約", icon: "我", targetType: "ext", target: "memberReservations", sort: 40, active: true },
    { id: "F005", zone: "front", title: "員工打卡", icon: "卡", targetType: "url", target: "./employee-mobile/", sort: 50, active: true },
    { id: "F006", zone: "front", title: "價目菜單", icon: "價", targetType: "go", target: "price", sort: 60, active: true },
    { id: "F007", zone: "front", title: "店長支出", icon: "支", targetType: "managerExpense", target: "entry", sort: 70, active: true },
    { id: "B001", zone: "back", title: "管理總覽", icon: "總", targetType: "go", target: "adminHome", sort: 10, active: true },
    { id: "B002", zone: "back", title: "基礎配置", icon: "基", targetType: "go", target: "config", sort: 20, active: true },
    { id: "B003", zone: "back", title: "施工人員", icon: "施", targetType: "go", target: "workers", sort: 30, active: true },
    { id: "B004", zone: "back", title: "價目管理", icon: "價", targetType: "go", target: "prices", sort: 40, active: true },
    { id: "B005", zone: "back", title: "訂單管理", icon: "訂", targetType: "go", target: "orders", sort: 50, active: true },
    { id: "B006", zone: "back", title: "行事曆", icon: "曆", targetType: "go", target: "calendar", sort: 60, active: true },
    { id: "B007", zone: "back", title: "客戶管理", icon: "客", targetType: "go", target: "customers", sort: 70, active: true },
    { id: "B008", zone: "back", title: "財務報表", icon: "報", targetType: "go", target: "reports", sort: 80, active: true },
    { id: "B009", zone: "back", title: "菜單管理", icon: "菜", targetType: "ext", target: "menuAdmin", sort: 90, active: true },
    { id: "B010", zone: "back", title: "取消列表", icon: "取", targetType: "ext", target: "cancelAdmin", sort: 100, active: true },
    { id: "B011", zone: "back", title: "品牌設定", icon: "色", targetType: "brand", target: "settings", sort: 110, active: true },
    { id: "B012", zone: "back", title: "權限管理", icon: "權", targetType: "admin", target: "rbac", sort: 120, active: true },
    { id: "B013", zone: "back", title: "人資管理", icon: "人", targetType: "admin", target: "hr", sort: 130, active: true },
    { id: "B014", zone: "back", title: "財務管理", icon: "財", targetType: "admin", target: "finance", sort: 140, active: true },
    { id: "B015", zone: "back", title: "庫存管理", icon: "庫", targetType: "admin", target: "operation", sort: 150, active: true },
    { id: "B016", zone: "back", title: "系統日誌", icon: "誌", targetType: "admin", target: "logs", sort: 160, active: true },
    { id: "B017", zone: "back", title: "新增/排序按鈕", icon: "加", targetType: "screen", target: "manager", sort: 170, active: true },
    { id: "B018", zone: "back", title: "快捷設定", icon: "快", targetType: "shortcut", target: "settings", sort: 180, active: true },
    { id: "B019", zone: "back", title: "收款核銷", icon: "收", targetType: "finance", target: "checkout", sort: 190, active: true },
    { id: "B020", zone: "back", title: "營收報表", icon: "報", targetType: "finance", target: "revenue", sort: 200, active: true },
    { id: "B021", zone: "back", title: "收款流水", icon: "流", targetType: "finance", target: "payments", sort: 210, active: true },
    { id: "B022", zone: "back", title: "登出後台", icon: "出", targetType: "act", target: "logout", sort: 220, active: true }
  ];
  const TARGETS = [
    ["go|front", "前台預約"], ["go|paste", "貼上填單"], ["go|eval", "後台評估"], ["go|site", "現場預約"],
    ["go|orders", "訂單管理"], ["go|calendar", "行事曆"], ["go|customers", "客戶資料"], ["go|price", "價目菜單"],
    ["go|adminHome", "管理總覽"], ["go|config", "基礎配置"], ["go|workers", "施工人員"], ["go|prices", "價目管理"],
    ["go|reports", "財務報表"], ["go|logs", "操作紀錄"], ["ext|publicMenu", "圖片菜單"], ["ext|memberReservations", "我的預約"],
    ["ext|menuAdmin", "菜單管理"], ["ext|cancelAdmin", "取消/改期管理"], ["brand|settings", "品牌設定"],
    ["admin|rbac", "權限管理"], ["admin|hr", "人資管理"], ["admin|finance", "財務管理"], ["admin|operation", "庫存管理"], ["admin|logs", "系統日誌"],
    ["screen|manager", "畫面管理"], ["shortcut|settings", "快捷設定"], ["finance|checkout", "收款核銷"], ["finance|revenue", "營收報表"], ["finance|payments", "收款流水"], ["managerExpense|entry", "店長支出"], ["url|./employee-mobile/", "員工打卡"], ["act|logout", "登出後台"]
  ];

  function getDb() {
    const db = window.db || JSON.parse(localStorage.getItem(KEY) || "{}");
    db.screenItems ||= DEFAULT_ITEMS.map((item) => ({ ...item }));
    DEFAULT_ITEMS.forEach((item) => {
      if (!db.screenItems.some((row) => row.zone === item.zone && row.targetType === item.targetType && row.target === item.target)) {
        db.screenItems.push({ ...item, id: `${item.id}_${Date.now()}` });
      }
    });
    db.screenItems.forEach((item) => {
      if (item.zone === "back" && item.targetType === "screen" && item.target === "manager") {
        item.title = "新增/排序按鈕";
        item.icon = "加";
      }
    });
    window.db = db;
    return db;
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(getDb())); }
  function esc(v) { return String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function el(id) { return document.getElementById(id); }
  function val(id) { return (el(id)?.value || "").trim(); }
  function attrs(item) {
    if (item.targetType === "go") return `data-go="${esc(item.target)}"`;
    if (item.targetType === "admin") return `data-admin-module="${esc(item.target)}"`;
    if (item.targetType === "url") return `data-screen-url="${esc(item.target)}"`;
    if (item.targetType === "brand") return `data-brand-open="1"`;
    if (item.targetType === "screen") return "data-screen-manager";
    if (item.targetType === "shortcut") return "data-shortcut-settings";
    if (item.targetType === "finance") return `data-finance-page="${esc(item.target)}"`;
    if (item.targetType === "managerExpense") return "data-manager-expense-entry";
    if (item.targetType === "act") return `data-act="${esc(item.target)}"`;
    return `data-menu-action="${esc(item.target)}"`;
  }
  function tile(item) {
    return `<button data-screen-owned="1" ${attrs(item)}><span>${esc(item.icon || "功")}</span><b>${esc(item.title)}</b></button>`;
  }
  function items(zone) {
    return getDb().screenItems.filter((x) => x.zone === zone && x.active !== false).sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
  }
  function beautifyShell() {
    const db = getDb();
    document.body.classList.toggle("admin-clean-mode", Boolean(db.authed));
    applyStoreTodayStats();
    if (db.authed && db.view === "adminHome" && window.modulePermissionDashboard) return;
    const grid = document.querySelector(".tool-grid");
    if (grid) {
      const zone = db.view === "adminHome" ? "back" : db.view === "home" ? "front" : "";
      if (zone) {
        const signature = `${zone}:${items(zone).map((x) => `${x.id}-${x.title}-${x.sort}-${x.active}`).join("|")}`;
        const ownedCount = grid.querySelectorAll("[data-screen-owned]").length;
        if (grid.dataset.screenSignature !== signature || ownedCount !== items(zone).length || grid.children.length !== items(zone).length) {
          grid.dataset.screenSignature = signature;
          grid.classList.add("screen-workspace-grid");
          grid.innerHTML = items(zone).map(tile).join("");
        }
      }
    }
    addOrderDeleteButtons();
  }
  function applyStoreTodayStats() {
    const db = getDb();
    if (!["home", "adminHome"].includes(db.view)) return;
    const stats = document.querySelector(".stats-grid");
    if (!stats) return;
    const stores = ["三重", "桃園", "新竹", "台南"];
    const today = new Date().toISOString().slice(0, 10);
    const signature = `store-today:${today}:${(db.orders || []).map((o) => `${o.id}-${o.store}-${o.date}`).join("|")}`;
    if (stats.dataset.storeTodaySignature === signature) return;
    stats.dataset.storeTodaySignature = signature;
    stats.innerHTML = stores.map((store) => {
      const count = (db.orders || []).filter((order) => order.store === store && order.date === today && order.status !== "取消").length;
      return `<article class="card stat-card store-today-card"><span>${store} 當天預約車輛</span><strong>${count} 台</strong></article>`;
    }).join("");
  }
  function addOrderDeleteButtons() {
    const db = getDb();
    if (db.view !== "orders") return;
    document.querySelectorAll(".table-wrap tbody tr").forEach((row) => {
      if (row.querySelector("[data-delete-order]")) return;
      const firstCell = row.querySelector("td");
      const lastCell = row.querySelector("td:last-child");
      const orderId = (firstCell?.textContent || "").trim();
      if (!orderId || !lastCell) return;
      lastCell.insertAdjacentHTML("beforeend", `<button class="danger-btn" data-delete-order="${esc(orderId)}">刪除</button>`);
    });
  }
  function row(item, index, listLength) {
    return `<article class="screen-row">
      <div class="screen-handle">${index + 1}</div>
      <input data-screen-field="icon" data-id="${esc(item.id)}" value="${esc(item.icon || "")}" aria-label="圖示">
      <input data-screen-field="title" data-id="${esc(item.id)}" value="${esc(item.title)}" aria-label="名稱">
      <label class="switch"><input data-screen-field="active" data-id="${esc(item.id)}" type="checkbox" ${item.active !== false ? "checked" : ""}><span></span></label>
      <button ${index === 0 ? "disabled" : ""} data-screen-move="${esc(item.id)}" data-dir="-1">上移</button>
      <button ${index === listLength - 1 ? "disabled" : ""} data-screen-move="${esc(item.id)}" data-dir="1">下移</button>
      <button class="warn" data-screen-delete="${esc(item.id)}">刪除</button>
    </article>`;
  }
  function panel(zone, title) {
    const list = getDb().screenItems.filter((x) => x.zone === zone).sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
    return `<section class="screen-panel" id="screen-${zone}">
      <div class="screen-panel-head"><h2>${title}</h2><small>左右滑動切換，使用上移/下移調整按鈕位置</small></div>
      <div class="screen-preview tool-grid screen-workspace-grid">${list.filter((x) => x.active !== false).map(tile).join("")}</div>
      <section class="card">
        <h3>新增 ${title} 按鈕</h3>
        <div class="grid four">
          <div class="field"><label>名稱</label><input id="screenTitle-${zone}" placeholder="例如：新功能"></div>
          <div class="field"><label>圖示字</label><input id="screenIcon-${zone}" placeholder="新" maxlength="2"></div>
          <div class="field"><label>連到哪裡</label><select id="screenTarget-${zone}">${TARGETS.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join("")}</select></div>
          <div class="field"><label>&nbsp;</label><button data-screen-add="${zone}">新增到${title}</button></div>
        </div>
      </section>
      <div class="screen-list">${list.map((item, index) => row(item, index, list.length)).join("")}</div>
    </section>`;
  }
  function page() {
    const app = el("app");
    if (!app) return;
    app.innerHTML = `<header class="topbar worktop"><div><h1>統一畫面管理</h1><small>前台 / 後台分頁，可滑動、可排序、可新增入口</small></div><button data-go="adminHome" class="ghost">回後台</button></header>
      <main class="page screen-manager-page">
        <div class="screen-tabs">
          <a href="#screen-front">前台畫面</a>
          <a href="#screen-back">後台畫面</a>
        </div>
        <div class="screen-slider">
          ${panel("front", "前台畫面")}
          ${panel("back", "後台畫面")}
        </div>
      </main>`;
  }
  function add(zone) {
    const [targetType, target] = val(`screenTarget-${zone}`).split("|");
    const list = getDb().screenItems.filter((x) => x.zone === zone);
    getDb().screenItems.push({
      id: `SI${Date.now()}`,
      zone,
      title: val(`screenTitle-${zone}`) || "新功能",
      icon: val(`screenIcon-${zone}`) || "新",
      targetType,
      target,
      sort: list.length ? Math.max(...list.map((x) => Number(x.sort || 0))) + 10 : 10,
      active: true
    });
    save();
    page();
  }
  function move(id, dir) {
    const db = getDb();
    const item = db.screenItems.find((x) => x.id === id);
    if (!item) return;
    const list = db.screenItems.filter((x) => x.zone === item.zone).sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
    const index = list.findIndex((x) => x.id === id);
    const swap = list[index + Number(dir)];
    if (!swap) return;
    [item.sort, swap.sort] = [swap.sort, item.sort];
    save();
    page();
  }
  document.addEventListener("click", (event) => {
    const open = event.target.closest("[data-screen-manager]");
    if (open) {
      event.preventDefault();
      page();
    }
    const addButton = event.target.closest("[data-screen-add]");
    if (addButton) add(addButton.dataset.screenAdd);
    const moveButton = event.target.closest("[data-screen-move]");
    if (moveButton) move(moveButton.dataset.screenMove, moveButton.dataset.dir);
    const del = event.target.closest("[data-screen-delete]");
    if (del && confirm("確定刪除這個畫面入口？")) {
      getDb().screenItems = getDb().screenItems.filter((x) => x.id !== del.dataset.screenDelete);
      save();
      page();
    }
    const url = event.target.closest("[data-screen-url]");
    if (url) location.href = url.dataset.screenUrl;
    const deleteOrder = event.target.closest("[data-delete-order]");
    if (deleteOrder) {
      const id = deleteOrder.dataset.deleteOrder;
      if (!confirm(`確定刪除訂單 ${id}？刪除後此畫面不會再顯示。`)) return;
      const db = getDb();
      db.orders = (db.orders || []).filter((order) => String(order.id) !== String(id));
      db.logs ||= [];
      db.logs.unshift(`${new Date().toLocaleString("zh-TW")} 刪除訂單 ${id}`);
      save();
      if (window.go) window.go("orders");
    }
  });
  document.addEventListener("input", (event) => {
    const input = event.target.closest("[data-screen-field]");
    if (!input) return;
    const item = getDb().screenItems.find((x) => x.id === input.dataset.id);
    if (!item) return;
    const field = input.dataset.screenField;
    item[field] = field === "active" ? input.checked : input.value;
    save();
  });
  function bootStableShell() {
    beautifyShell();
    setTimeout(beautifyShell, 80);
    setTimeout(beautifyShell, 240);
  }
  document.addEventListener("DOMContentLoaded", bootStableShell);
  window.addEventListener("ui:stabilize", beautifyShell);
  window.screenLayoutManager = { page, applyWorkspaces: beautifyShell };
})();
