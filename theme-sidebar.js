(function () {
  var MENU = [
    { label: "LINE預約管理", action: "data-go=\"orders\"", views: ["orders"] },
    { label: "預約評估", children: [
      { label: "前台預約", action: "data-go=\"front\"", views: ["front"] },
      { label: "貼上填單", action: "data-go=\"paste\"", views: ["paste"] },
      { label: "預約評估", action: "data-go=\"eval\"", views: ["eval"] }
    ] },
    { label: "製作報價單", children: [
      { label: "製作報價單", action: "data-make-quote-front", quote: true },
      { label: "報價單列表", action: "data-quote-page", quote: true }
    ] },
    { label: "施工開單", children: [
      { label: "訂單管理", action: "data-go=\"orders\"", views: ["orders"] },
      { label: "行事曆", action: "data-go=\"calendar\"", views: ["calendar"] },
      { label: "施工單追溯", action: "data-quote-workorders", quote: true }
    ] },
    { label: "車輛相簿", action: "data-go=\"customers\"", views: ["customers"] },
    { label: "財務報表", children: [
      { label: "財務報表", action: "data-go=\"reports\"", views: ["reports"] },
      { label: "收款核銷", action: "data-quote-page", quote: true }
    ] },
    { label: "人員打卡", action: "data-go=\"workers\"", views: ["workers"] },
    { label: "系統設定", children: [
      { label: "管理後台登入", action: "data-go=\"adminLogin\"", views: ["adminLogin"] },
      { label: "管理後台總覽", action: "data-go=\"adminHome\"", views: ["adminHome"] },
      { label: "基礎配置", action: "data-go=\"config\"", views: ["config"] },
      { label: "後台價格設定", action: "data-go=\"prices\"", views: ["prices"] },
      { label: "系統紀錄", action: "data-go=\"logs\"", views: ["logs"] }
    ] }
  ];

  var VIEW_TITLES = {
    home: "LINE預約管理",
    front: "前台預約",
    paste: "貼上填單",
    eval: "預約評估",
    site: "現場預約",
    orders: "LINE預約管理",
    calendar: "行事曆",
    customers: "車輛相簿 / 客戶",
    price: "價目菜單",
    adminLogin: "管理後台登入",
    adminHome: "管理後台總覽",
    config: "基礎配置",
    workers: "人員打卡",
    prices: "後台價格設定",
    reports: "財務報表",
    logs: "系統紀錄",
    quote: "製作報價單"
  };

  function esc(text) {
    return String(text || "").replace(/[&<>"']/g, function (m) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[m];
    });
  }

  function db() {
    return window.db || {};
  }

  function rawView() {
    return db().view || "home";
  }

  function view() {
    if (document.body.getAttribute("data-quote-active") === "1") return "quote";
    var currentView = rawView();
    return currentView === "home" ? "orders" : currentView;
  }

  function plan(order) {
    var data = db();
    var plans = data.cfg && data.cfg.plans ? data.cfg.plans : [];
    return plans.filter(function (item) { return item.id === order.plan; })[0] || { name: "-", price: 0 };
  }

  function active(item, current) {
    if (item.quote && current === "quote") return true;
    return (item.views || []).indexOf(current) > -1 || (item.children || []).some(function (child) {
      return active(child, current);
    });
  }

  function button(item, current) {
    return "<button class=\"cc-nav-item" + (active(item, current) ? " is-active" : "") + "\" " + (item.action || "") + ">" + esc(item.label) + "</button>";
  }

  function menuItem(item, current) {
    if (!item.children) return button(item, current);
    return "<details class=\"cc-nav-group\" " + (active(item, current) ? "open" : "") + "><summary>" + esc(item.label) + "</summary><div>" + item.children.map(function (child) {
      return button(child, current);
    }).join("") + "</div></details>";
  }

  function todayOrders() {
    var data = db();
    var orders = data.orders || [];
    var today = new Date().toISOString().slice(0, 10);
    return orders.filter(function (order) { return order.date === today; });
  }

  function account() {
    return "121112";
  }

  function renderSidebar() {
    var current = view();
    var aside = document.querySelector("[data-carcare-shell]");
    var sidebar = "<aside class=\"cc-sidebar\" data-carcare-shell>" +
      "<div class=\"cc-brand\"><strong>CarCare System</strong><small>" + esc(account()) + "</small><button data-cc-drawer-close aria-label=\"關閉選單\">×</button></div>" +
      "<nav>" + MENU.map(function (item) { return menuItem(item, current); }).join("") + "</nav>" +
      "</aside>";
    if (aside) {
      aside.outerHTML = sidebar;
    } else {
      document.body.classList.add("has-carcare-sidebar");
      document.body.insertAdjacentHTML("afterbegin", "<button class=\"cc-menu-button\" data-cc-drawer-open aria-label=\"開啟選單\">☰</button><div class=\"cc-drawer-mask\" data-cc-drawer-close></div>" + sidebar);
    }
  }

  function renderContentBar() {
    var main = document.querySelector("#app > main.page, #app .quote-export-page");
    if (!main) return;
    var current = view();
    var old = main.querySelector(".cc-contentbar");
    var title = VIEW_TITLES[current] || "LINE預約管理";
    var count = todayOrders().length || (db().orders || []).length || 0;
    var html = "<section class=\"cc-contentbar\"><div><h1>" + esc(title) + "</h1><small>CarCare System 門店管理</small></div><div class=\"cc-content-actions\"><strong>今日預約 " + count + "</strong><button aria-label=\"通知\">通知</button><span class=\"cc-avatar\">店長</span><button aria-label=\"縮小\">－</button></div></section>";
    if (old) old.outerHTML = html;
    else main.insertAdjacentHTML("afterbegin", html);
  }

  function lineRows(orders) {
    var fallback = [
      { id: "demo-1", name: "王先生", store: "三重門市", plate: "ABC-1234", car: "Altis", time: "09:30", status: "待確認", planName: "內裝清潔" },
      { id: "demo-2", name: "DEF-5678", store: "桃園門市", plate: "DEF-5678", car: "Altis", time: "11:00", status: "已排車", planName: "打蠟保養" },
      { id: "demo-3", name: "李小姐", store: "新竹門市", plate: "GHI-9012", car: "BMW", time: "14:30", status: "施工中", planName: "皮革護理" }
    ];
    var list = (orders.length ? orders : fallback).slice(0, 5);
    return list.map(function (order) {
      var service = order.planName || plan(order).name;
      var action = order.id && String(order.id).indexOf("demo-") !== 0 ? " data-open=\"" + esc(order.id) + "\"" : "";
      return "<article class=\"cc-appointment-row\"><div><b>" + esc(order.name || order.plate || "客戶") + "</b><small>" + esc(order.plate || order.car || "") + "</small></div><span>" + esc(order.store || "三重門市") + "</span><span>" + esc(order.time || "09:30") + "</span><span>" + esc(service) + "</span><button" + action + ">操作</button></article>";
    }).join("");
  }

  function detailCard(title, order) {
    var selected = order || {};
    return "<section class=\"cc-panel\"><h2>" + esc(title) + "</h2><dl class=\"cc-detail-list\"><div><dt>車主</dt><dd>" + esc(selected.name || "王先生") + "</dd></div><div><dt>車牌</dt><dd>" + esc(selected.plate || "DEF-5678") + "</dd></div><div><dt>服務項目</dt><dd>" + esc((selected.planName || (selected.plan ? plan(selected).name : "")) || "內裝清潔") + "</dd></div><div><dt>備註</dt><dd>" + esc(selected.note || "到店前 30 分鐘提醒客戶") + "</dd></div></dl><button class=\"cc-primary-action\">發送LINE提醒</button></section>";
  }

  function kpi(label, number) {
    return "<article class=\"cc-kpi-card\"><button aria-label=\"篩選\">⌄</button><span>" + esc(label) + "</span><strong>" + esc(number) + "</strong></article>";
  }

  function renderLineDashboard() {
    var main = document.querySelector("#app > main.page");
    if (!main || view() !== "orders") {
      document.body.classList.remove("cc-line-mode");
      return;
    }
    document.body.classList.add("cc-line-mode");
    var existing = main.querySelector(".cc-line-dashboard");
    if (existing) return;
    var orders = db().orders || [];
    var pending = orders.filter(function (order) { return order.status === "待確認"; }).length || 6;
    var today = todayOrders().length || 12;
    var complete = orders.filter(function (order) { return order.status === "已完工"; }).length || 10;
    var first = orders[0] || {};
    var second = orders[1] || {};
    var dashboard = "<section class=\"cc-line-dashboard\">" +
      "<section class=\"cc-overview\"><select aria-label=\"門市\"><option>桃園中壢門市</option><option>三重門市</option><option>新竹門市</option><option>台南門市</option></select><h2>今日營運速覽</h2><button>通知頁 &gt;</button></section>" +
      "<section class=\"cc-kpi-grid\">" +
      kpi("全部預約", orders.length || 28) + kpi("待確記", pending) + kpi("今日到店", today) + kpi("待提醒牽車", 10) + kpi("今日完成", complete) +
      "</section>" +
      "<section class=\"cc-line-columns\"><section class=\"cc-panel cc-list-panel\"><h2>預約列表</h2><div class=\"cc-list-head\"><span>車主</span><span>門市</span><span>預約時間</span><span>施工項目</span><span></span></div>" + lineRows(orders) + "</section>" + detailCard("預約細節", first) + detailCard("預約細節", second) + "</section>" +
      "<section class=\"cc-panel cc-timeline\"><h2>今日排程時間軸</h2><div><p><i></i><b>09:30</b><span>王先生 / 內裝清潔</span></p><p><i></i><b>11:00</b><span>DEF-5678 / 打蠟保養</span></p><p><i></i><b>14:30</b><span>李小姐 / 皮革護理</span></p></div></section>" +
      "</section>";
    main.insertAdjacentHTML("afterbegin", dashboard);
  }

  function navigateTo(target) {
    document.body.removeAttribute("data-quote-active");
    if (typeof window.go === "function") {
      window.go(target);
      return;
    }
    var data = db();
    data.view = target;
    try { localStorage.setItem("beauty-crm-v10", JSON.stringify(data)); } catch (e) {}
    location.reload();
  }

  function refresh() {
    renderSidebar();
    renderContentBar();
    renderLineDashboard();
  }

  document.addEventListener("click", function (event) {
    var directNav = event.target.closest && event.target.closest(".cc-sidebar [data-go]");
    if (directNav) {
      event.preventDefault();
      event.stopPropagation();
      document.body.classList.remove("cc-drawer-open");
      navigateTo(directNav.dataset.go);
      setTimeout(refresh, 80);
      return;
    }
    if (event.target.closest && event.target.closest("[data-cc-drawer-open]")) document.body.classList.add("cc-drawer-open");
    if (event.target.closest && event.target.closest("[data-cc-drawer-close]")) document.body.classList.remove("cc-drawer-open");
    if (event.target.closest && event.target.closest(".cc-sidebar [data-make-quote-front], .cc-sidebar [data-quote-page], .cc-sidebar [data-quote-workorders]")) {
      document.body.classList.remove("cc-drawer-open");
      setTimeout(refresh, 80);
    }
  }, true);

  document.addEventListener("DOMContentLoaded", refresh);
  document.addEventListener("ui:stabilize", refresh);
  window.addEventListener("popstate", function () { setTimeout(refresh, 80); });
  setInterval(refresh, 1200);
})();
