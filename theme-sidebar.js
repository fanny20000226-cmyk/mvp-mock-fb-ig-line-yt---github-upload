(function () {
  var MENU = [
    { label: "LINE\u9810\u7d04\u7ba1\u7406", action: "data-go=\"home\"", views: ["home"] },
    { label: "\u9810\u7d04\u8a55\u4f30", children: [
      { label: "\u524d\u53f0\u9810\u7d04", action: "data-go=\"front\"", views: ["front"] },
      { label: "\u8cbc\u4e0a\u586b\u55ae", action: "data-go=\"paste\"", views: ["paste"] },
      { label: "\u9810\u7d04\u8a55\u4f30", action: "data-go=\"eval\"", views: ["eval"] }
    ] },
    { label: "\u88fd\u4f5c\u5831\u50f9\u55ae", children: [
      { label: "\u88fd\u4f5c\u5831\u50f9\u55ae", action: "data-make-quote-front", quote: true },
      { label: "\u5831\u50f9\u55ae\u5217\u8868", action: "data-quote-page", quote: true }
    ] },
    { label: "\u65bd\u5de5\u958b\u55ae", children: [
      { label: "\u8a02\u55ae\u7ba1\u7406", action: "data-go=\"orders\"", views: ["orders"] },
      { label: "\u884c\u4e8b\u66c6", action: "data-go=\"calendar\"", views: ["calendar"] },
      { label: "\u65bd\u5de5\u55ae\u8ffd\u6eaf", action: "data-quote-workorders", quote: true }
    ] },
    { label: "\u8eca\u8f1b\u76f8\u7c3f", action: "data-go=\"customers\"", views: ["customers"] },
    { label: "\u8ca1\u52d9\u5831\u8868", children: [
      { label: "\u8ca1\u52d9\u5831\u8868", action: "data-go=\"reports\"", views: ["reports"] },
      { label: "\u6536\u6b3e\u6838\u92b7", action: "data-quote-page", quote: true }
    ] },
    { label: "\u4eba\u54e1\u6253\u5361", action: "data-go=\"workers\"", views: ["workers"] },
    { label: "\u7cfb\u7d71\u8a2d\u5b9a", children: [
      { label: "\u7ba1\u7406\u5f8c\u53f0\u767b\u5165", action: "data-go=\"adminLogin\"", views: ["adminLogin"] },
      { label: "\u7ba1\u7406\u5f8c\u53f0\u7e3d\u89bd", action: "data-go=\"adminHome\"", views: ["adminHome"] },
      { label: "\u57fa\u790e\u914d\u7f6e", action: "data-go=\"config\"", views: ["config"] },
      { label: "\u5f8c\u53f0\u50f9\u683c\u8a2d\u5b9a", action: "data-go=\"prices\"", views: ["prices"] },
      { label: "\u7cfb\u7d71\u7d00\u9304", action: "data-go=\"logs\"", views: ["logs"] }
    ] }
  ];

  var VIEW_TITLES = {
    home: "LINE\u9810\u7d04\u7ba1\u7406",
    front: "\u524d\u53f0\u9810\u7d04",
    paste: "\u8cbc\u4e0a\u586b\u55ae",
    eval: "\u9810\u7d04\u8a55\u4f30",
    site: "\u73fe\u5834\u9810\u7d04",
    orders: "\u8a02\u55ae\u7ba1\u7406",
    calendar: "\u884c\u4e8b\u66c6",
    customers: "\u8eca\u8f1b\u76f8\u7c3f / \u5ba2\u6236",
    price: "\u50f9\u76ee\u83dc\u55ae",
    adminLogin: "\u7ba1\u7406\u5f8c\u53f0\u767b\u5165",
    adminHome: "\u7ba1\u7406\u5f8c\u53f0\u7e3d\u89bd",
    config: "\u57fa\u790e\u914d\u7f6e",
    workers: "\u4eba\u54e1\u6253\u5361",
    prices: "\u5f8c\u53f0\u50f9\u683c\u8a2d\u5b9a",
    reports: "\u8ca1\u52d9\u5831\u8868",
    logs: "\u7cfb\u7d71\u7d00\u9304",
    quote: "\u88fd\u4f5c\u5831\u50f9\u55ae"
  };

  var refreshTimer = null;

  function esc(text) {
    return String(text || "").replace(/[&<>"']/g, function (m) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[m];
    });
  }

  function db() {
    return window.db || {};
  }

  function view() {
    if (document.body.getAttribute("data-quote-active") === "1") return "quote";
    return db().view || "home";
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

  function navButton(item, current) {
    return "<button class=\"cc-nav-item" + (active(item, current) ? " is-active" : "") + "\" " + (item.action || "") + ">" + esc(item.label) + "</button>";
  }

  function menuItem(item, current) {
    if (!item.children) return navButton(item, current);
    return "<details class=\"cc-nav-group\" " + (active(item, current) ? "open" : "") + "><summary>" + esc(item.label) + "</summary><div>" + item.children.map(function (child) {
      return navButton(child, current);
    }).join("") + "</div></details>";
  }

  function todayOrders() {
    var data = db();
    var orders = data.orders || [];
    var today = new Date().toISOString().slice(0, 10);
    return orders.filter(function (order) { return order.date === today; });
  }

  function renderSidebar() {
    var current = view();
    var key = current + "|121112";
    var aside = document.querySelector("[data-carcare-shell]");
    var sidebar = "<aside class=\"cc-sidebar\" data-carcare-shell data-render-key=\"" + esc(key) + "\">" +
      "<div class=\"cc-brand\"><strong>CarCare System</strong><small>121112</small><button data-cc-drawer-close aria-label=\"close\">x</button></div>" +
      "<nav>" + MENU.map(function (item) { return menuItem(item, current); }).join("") + "</nav>" +
      "</aside>";
    if (aside) {
      if (aside.getAttribute("data-render-key") !== key) aside.outerHTML = sidebar;
      return;
    }
    document.body.classList.add("has-carcare-sidebar");
    document.body.insertAdjacentHTML("afterbegin", "<button class=\"cc-menu-button\" data-cc-drawer-open aria-label=\"menu\">☰</button><div class=\"cc-drawer-mask\" data-cc-drawer-close></div>" + sidebar);
  }

  function renderContentBar() {
    var main = document.querySelector("#app > main.page, #app .quote-export-page");
    if (!main) return;
    var current = view();
    var title = VIEW_TITLES[current] || "LINE\u9810\u7d04\u7ba1\u7406";
    var count = todayOrders().length || (db().orders || []).length || 0;
    var key = current + "|" + count + "|" + title;
    var old = main.querySelector(".cc-contentbar");
    if (old && old.getAttribute("data-render-key") === key) return;
    var html = "<section class=\"cc-contentbar\" data-render-key=\"" + esc(key) + "\"><div><h1>" + esc(title) + "</h1><small>CarCare System \u9580\u5e97\u7ba1\u7406</small></div><div class=\"cc-content-actions\"><strong>\u4eca\u65e5\u9810\u7d04 " + count + "</strong><button aria-label=\"notice\">\u901a\u77e5</button><span class=\"cc-avatar\">\u5e97\u9577</span><button aria-label=\"minimize\">-</button></div></section>";
    if (old) old.outerHTML = html;
    else main.insertAdjacentHTML("afterbegin", html);
  }

  function lineRows(orders) {
    var fallback = [
      { id: "demo-1", name: "\u738b\u5148\u751f", store: "\u4e09\u91cd\u9580\u5e02", plate: "ABC-1234", car: "Altis", time: "09:30", planName: "\u5167\u88dd\u6e05\u6f54" },
      { id: "demo-2", name: "DEF-5678", store: "\u6843\u5712\u9580\u5e02", plate: "DEF-5678", car: "Altis", time: "11:00", planName: "\u6253\u881f\u4fdd\u990a" },
      { id: "demo-3", name: "\u674e\u5c0f\u59d0", store: "\u65b0\u7af9\u9580\u5e02", plate: "GHI-9012", car: "BMW", time: "14:30", planName: "\u76ae\u9769\u8b77\u7406" }
    ];
    var list = (orders.length ? orders : fallback).slice(0, 5);
    return list.map(function (order) {
      var service = order.planName || plan(order).name;
      var action = order.id && String(order.id).indexOf("demo-") !== 0 ? " data-open=\"" + esc(order.id) + "\"" : "";
      return "<article class=\"cc-appointment-row\"><div><b>" + esc(order.name || order.plate || "\u5ba2\u6236") + "</b><small>" + esc(order.plate || order.car || "") + "</small></div><span>" + esc(order.store || "\u4e09\u91cd\u9580\u5e02") + "</span><span>" + esc(order.time || "09:30") + "</span><span>" + esc(service) + "</span><button" + action + ">\u64cd\u4f5c</button></article>";
    }).join("");
  }

  function detailCard(title, order) {
    var selected = order || {};
    var service = (selected.planName || (selected.plan ? plan(selected).name : "")) || "\u5167\u88dd\u6e05\u6f54";
    return "<section class=\"cc-panel\"><h2>" + esc(title) + "</h2><dl class=\"cc-detail-list\"><div><dt>\u8eca\u4e3b</dt><dd>" + esc(selected.name || "\u738b\u5148\u751f") + "</dd></div><div><dt>\u8eca\u724c</dt><dd>" + esc(selected.plate || "DEF-5678") + "</dd></div><div><dt>\u670d\u52d9\u9805\u76ee</dt><dd>" + esc(service) + "</dd></div><div><dt>\u5099\u8a3b</dt><dd>" + esc(selected.note || "\u5230\u5e97\u524d 30 \u5206\u9418\u63d0\u9192\u5ba2\u6236") + "</dd></div></dl><button class=\"cc-primary-action\">\u767c\u9001LINE\u63d0\u9192</button></section>";
  }

  function kpi(label, number) {
    return "<article class=\"cc-kpi-card\"><button aria-label=\"filter\">⌄</button><span>" + esc(label) + "</span><strong>" + esc(number) + "</strong></article>";
  }

  function renderLineDashboard() {
    var main = document.querySelector("#app > main.page");
    if (!main || view() !== "home") {
      document.body.classList.remove("cc-line-mode");
      return;
    }
    document.body.classList.add("cc-line-mode");
    if (main.querySelector(".cc-line-dashboard")) return;
    var orders = db().orders || [];
    var pending = orders.filter(function (order) { return order.status === "\u5f85\u78ba\u8a8d"; }).length || 6;
    var today = todayOrders().length || 12;
    var complete = orders.filter(function (order) { return order.status === "\u5df2\u5b8c\u5de5"; }).length || 10;
    var first = orders[0] || {};
    var second = orders[1] || {};
    var dashboard = "<section class=\"cc-line-dashboard\">" +
      "<section class=\"cc-overview\"><select aria-label=\"store\"><option>\u6843\u5712\u4e2d\u58e2\u9580\u5e02</option><option>\u4e09\u91cd\u9580\u5e02</option><option>\u65b0\u7af9\u9580\u5e02</option><option>\u53f0\u5357\u9580\u5e02</option></select><h2>\u4eca\u65e5\u71df\u904b\u901f\u89bd</h2><button>\u901a\u77e5\u9801 &gt;</button></section>" +
      "<section class=\"cc-kpi-grid\">" +
      kpi("\u5168\u90e8\u9810\u7d04", orders.length || 28) + kpi("\u5f85\u78ba\u8a18", pending) + kpi("\u4eca\u65e5\u5230\u5e97", today) + kpi("\u5f85\u63d0\u9192\u727d\u8eca", 10) + kpi("\u4eca\u65e5\u5b8c\u6210", complete) +
      "</section>" +
      "<section class=\"cc-line-columns\"><section class=\"cc-panel cc-list-panel\"><h2>\u9810\u7d04\u5217\u8868</h2><div class=\"cc-list-head\"><span>\u8eca\u4e3b</span><span>\u9580\u5e02</span><span>\u9810\u7d04\u6642\u9593</span><span>\u65bd\u5de5\u9805\u76ee</span><span></span></div>" + lineRows(orders) + "</section>" + detailCard("\u9810\u7d04\u7d30\u7bc0", first) + detailCard("\u9810\u7d04\u7d30\u7bc0", second) + "</section>" +
      "<section class=\"cc-panel cc-timeline\"><h2>\u4eca\u65e5\u6392\u7a0b\u6642\u9593\u8ef8</h2><div><p><i></i><b>09:30</b><span>\u738b\u5148\u751f / \u5167\u88dd\u6e05\u6f54</span></p><p><i></i><b>11:00</b><span>DEF-5678 / \u6253\u881f\u4fdd\u990a</span></p><p><i></i><b>14:30</b><span>\u674e\u5c0f\u59d0 / \u76ae\u9769\u8b77\u7406</span></p></div></section>" +
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

  function scheduleRefresh(delay) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refresh, delay || 80);
  }

  document.addEventListener("click", function (event) {
    var directNav = event.target.closest && event.target.closest(".cc-sidebar [data-go]");
    if (directNav) {
      event.preventDefault();
      event.stopPropagation();
      document.body.classList.remove("cc-drawer-open");
      navigateTo(directNav.dataset.go);
      scheduleRefresh(80);
      return;
    }
    if (event.target.closest && event.target.closest("[data-cc-drawer-open]")) document.body.classList.add("cc-drawer-open");
    if (event.target.closest && event.target.closest("[data-cc-drawer-close]")) document.body.classList.remove("cc-drawer-open");
    if (event.target.closest && event.target.closest(".cc-sidebar [data-make-quote-front], .cc-sidebar [data-quote-page], .cc-sidebar [data-quote-workorders]")) {
      document.body.classList.remove("cc-drawer-open");
    }
    scheduleRefresh(120);
  }, true);

  document.addEventListener("change", function () { scheduleRefresh(120); }, true);
  document.addEventListener("submit", function () { scheduleRefresh(180); }, true);
  document.addEventListener("DOMContentLoaded", refresh);
  document.addEventListener("ui:stabilize", refresh);
  window.addEventListener("popstate", function () { scheduleRefresh(80); });
})();
