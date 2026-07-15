(function () {
  var NAV_ITEMS = [
    { label: "LINE預約管理", action: "data-go=\"orders\"", views: ["orders", "calendar"] },
    { label: "預約評估", children: [
      { label: "前台預約", action: "data-go=\"front\"", views: ["front"] },
      { label: "貼上填單", action: "data-go=\"paste\"", views: ["paste"] },
      { label: "預約評估", action: "data-go=\"eval\"", views: ["eval"] }
    ] },
    { label: "製作報價單", action: "data-make-quote-front", quote: true },
    { label: "施工開單", children: [
      { label: "訂單管理", action: "data-go=\"orders\"", views: ["orders"] },
      { label: "行事曆", action: "data-go=\"calendar\"", views: ["calendar"] },
      { label: "工單追溯", action: "data-quote-workorders", quote: true }
    ] },
    { label: "車輛相簿", action: "data-go=\"customers\"", views: ["customers"] },
    { label: "財務報表", children: [
      { label: "報表總覽", action: "data-go=\"reports\"", views: ["reports"] },
      { label: "收款核銷", action: "data-quote-page", quote: true }
    ] },
    { label: "人員打卡", action: "data-go=\"workers\"", views: ["workers"] },
    { label: "系統設定", action: "data-go=\"config\"", views: ["config", "prices", "logs", "adminHome"] }
  ];

  function esc(text) {
    return String(text || "").replace(/[&<>"']/g, function (m) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[m];
    });
  }

  function currentView() {
    var db = window.db || {};
    if (document.body.getAttribute("data-quote-active") === "1") return "quote";
    return db.view || "home";
  }

  function isActive(item, view) {
    if (item.quote && view === "quote") return true;
    return (item.views || []).indexOf(view) > -1 || (item.children || []).some(function (child) { return isActive(child, view); });
  }

  function itemButton(item, view) {
    var active = isActive(item, view) ? " is-active" : "";
    return "<button class=\"cc-nav-item" + active + "\" " + (item.action || "") + "><span>" + esc(item.label) + "</span></button>";
  }

  function itemHtml(item, view) {
    if (item.children && item.children.length) {
      return "<details class=\"cc-nav-group\" " + (isActive(item, view) ? "open" : "") + "><summary>" + esc(item.label) + "</summary><div>" + item.children.map(function (child) {
        return itemButton(child, view);
      }).join("") + "</div></details>";
    }
    return itemButton(item, view);
  }

  function accountLabel() {
    var db = window.db || {};
    if (db.authed && db.currentRole) return db.currentRole;
    if (db.authed) return "管理員";
    return "未登入";
  }

  function renderSidebar() {
    var view = currentView();
    var old = document.querySelector("[data-carcare-shell]");
    var html = "<button class=\"cc-menu-button\" data-cc-drawer-open aria-label=\"開啟選單\">☰</button>" +
      "<div class=\"cc-drawer-mask\" data-cc-drawer-close></div>" +
      "<aside class=\"cc-sidebar\" data-carcare-shell>" +
      "<div class=\"cc-brand\"><strong>CarCare System</strong><small>目前帳號：" + esc(accountLabel()) + "</small><button data-cc-drawer-close aria-label=\"關閉選單\">×</button></div>" +
      "<nav>" + NAV_ITEMS.map(function (item) { return itemHtml(item, view); }).join("") + "</nav>" +
      "</aside>";
    if (old) {
      old.outerHTML = html.match(/<aside[\s\S]*<\/aside>/)[0];
      return;
    }
    document.body.classList.add("has-carcare-sidebar");
    document.body.insertAdjacentHTML("afterbegin", html);
  }

  function openDrawer() {
    document.body.classList.add("cc-drawer-open");
  }

  function closeDrawer() {
    document.body.classList.remove("cc-drawer-open");
  }

  document.addEventListener("click", function (event) {
    var open = event.target.closest && event.target.closest("[data-cc-drawer-open]");
    var close = event.target.closest && event.target.closest("[data-cc-drawer-close]");
    if (open) openDrawer();
    if (close) closeDrawer();
    if (event.target.closest && event.target.closest(".cc-sidebar [data-go], .cc-sidebar [data-make-quote-front], .cc-sidebar [data-quote-page], .cc-sidebar [data-quote-workorders]")) {
      closeDrawer();
      setTimeout(renderSidebar, 80);
    }
  });

  document.addEventListener("DOMContentLoaded", renderSidebar);
  document.addEventListener("ui:stabilize", renderSidebar);
  window.addEventListener("popstate", function () { setTimeout(renderSidebar, 80); });
  setInterval(renderSidebar, 1200);
})();
