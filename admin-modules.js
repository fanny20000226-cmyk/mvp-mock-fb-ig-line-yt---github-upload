(() => {
  const KEY = "beauty-crm-v10";
  const ROLES = ["SUPER_ADMIN", "HR_ADMIN", "FINANCE_ADMIN", "EMPLOYEE"];

  function data() {
    const db = window.db || JSON.parse(localStorage.getItem(KEY) || "{}");
    db.adminAccounts ||= [
      { id: "A001", username: "admin_master", password: "Master@123456", role: "SUPER_ADMIN", active: true },
      { id: "A002", username: "hr_manager", password: "Hr@654321", role: "HR_ADMIN", active: true },
      { id: "A003", username: "finance_manager", password: "Fin@789012", role: "FINANCE_ADMIN", active: true }
    ];
    db.hrEmployees ||= [
      { id: "E001", username: "emp001", password: "Emp@123456", name: "示範員工", phone: "0911222333", department: "三重門市", position: "美容技師", role: "EMPLOYEE", active: true }
    ];
    db.attendanceRules ||= [
      { id: "AR001", department: "三重門市", workStart: "09:00", workEnd: "18:00", lateGrace: 5, active: true }
    ];
    db.clockRecords ||= [];
    db.leaveRequests ||= [];
    db.overtimeRequests ||= [];
    db.punchFixRequests ||= [];
    db.fieldClockReviews ||= [];
    db.monthAttendance ||= [];
    db.financeLedger ||= [];
    db.payrollRecords ||= [];
    db.financeApprovals ||= [];
    db.inventoryItems ||= [
      { id: "SKU001", name: "鍍膜藥水", unit: "瓶", safeStock: 10, qty: 18, active: true }
    ];
    db.purchaseInbound ||= [];
    db.transferOut ||= [];
    db.stockCounts ||= [];
    db.systemLogs ||= [];
    window.db = db;
    return db;
  }

  function save() { localStorage.setItem(KEY, JSON.stringify(data())); }
  function esc(v) { return String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function $(id) { return document.getElementById(id); }
  function val(id) { return ($(id)?.value || "").trim(); }
  function num(id) { return Number(val(id) || 0); }
  function money(v) { return `$${Number(v || 0).toLocaleString("zh-TW")}`; }
  function action(name, module, detail = {}) {
    data().systemLogs.unshift({ id: `LOG${Date.now()}`, actor: "local-admin", action: name, module, ip: "local-pwa", detail, time: new Date().toLocaleString("zh-TW") });
    save();
  }
  function btn(text, attrs = "", cls = "") { return `<button class="${cls}" ${attrs}>${text}</button>`; }
  function input(label, id, value = "", type = "text") { return `<div class="field"><label>${label}</label><input id="${id}" type="${type}" value="${esc(value)}"></div>`; }
  function textarea(label, id, value = "") { return `<div class="field"><label>${label}</label><textarea id="${id}">${esc(value)}</textarea></div>`; }
  function select(label, id, items, selected = "") {
    return `<div class="field"><label>${label}</label><select id="${id}">${items.map((x) => `<option value="${esc(x)}" ${String(x) === String(selected) ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></div>`;
  }
  function table(headers, rows) {
    return `<section class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("") || `<tr><td colspan="${headers.length}">目前沒有資料</td></tr>`}</tbody></table></section>`;
  }
  function shell(title, body) {
    if (!data().authed && window.go) return window.go("adminLogin");
    $("app").innerHTML = `<header class="topbar worktop"><div><h1>${title}</h1><small>RBAC 權限 / 人資 / 財務 / 庫存管理</small></div>${btn("回首頁", 'data-go="home"', "ghost")}</header>
      <div class="admin-menu">
        ${btn("權限管理", 'data-admin-module="rbac"')}
        ${btn("人資管理", 'data-admin-module="hr"')}
        ${btn("財務管理", 'data-admin-module="finance"')}
        ${btn("庫存管理", 'data-admin-module="operation"')}
        ${btn("系統日誌", 'data-admin-module="logs"')}
        ${btn("快捷按鈕", 'data-shortcut-settings')}
        ${btn("員工打卡", 'data-shortcut-url="./employee-mobile/"')}
        ${btn("舊後台", 'data-go="adminHome"')}
      </div>
      <main class="page">${body}</main>`;
  }

  function rbacPage() {
    const db = data();
    shell("權限管理", `
      <section class="card"><h2>新增管理帳號</h2>
        <div class="grid three">${input("帳號", "adminUsername")}${input("初始密碼", "adminPassword", "", "password")}${select("角色", "adminRole", ROLES)}</div>
        ${btn("新增帳號", 'data-admin-action="addAdmin"')}
      </section>
      <section class="card"><h2>重置密碼</h2>
        <div class="grid three">${select("選擇帳號", "resetAccount", db.adminAccounts.map((x) => x.username))}${input("新密碼", "resetPassword", "", "password")}<div class="field"><label>&nbsp;</label>${btn("重置", 'data-admin-action="resetAdminPassword"', "warn")}</div></div>
        <p class="muted">畫面不回顯完整密碼。正式後端範例已放在 backend/modules/auth，會使用 BCrypt 儲存。</p>
      </section>
      ${table(["帳號", "角色", "啟用"], db.adminAccounts.map((x) => `<tr><td>${esc(x.username)}</td><td>${esc(x.role)}</td><td>${x.active ? "是" : "否"}</td></tr>`))}
    `);
  }

  function hrPage() {
    const db = data();
    const departments = [...new Set(["三重門市", "桃園門市", "新竹門市", "台南門市", ...db.hrEmployees.map((x) => x.department).filter(Boolean)])];
    shell("人資管理", `
      <section class="stats">
        <article><b>${db.hrEmployees.length}</b><span>員工</span></article>
        <article><b>${db.clockRecords.length}</b><span>打卡</span></article>
        <article><b>${db.punchFixRequests.length}</b><span>補卡申請</span></article>
        <article><b>${db.fieldClockReviews.length}</b><span>外勤待審</span></article>
      </section>
      <section class="card"><h2>新增員工帳號</h2>
        <div class="grid three">${input("姓名", "empName")}${input("登入帳號", "empUsername")}${input("初始密碼", "empPassword", "Emp@123456", "password")}${input("電話", "empPhone")}${input("部門/門市", "empDepartment", "三重門市")}${input("職位", "empPosition", "美容技師")}</div>
        ${btn("新增員工", 'data-admin-action="addEmployee"')} ${btn("匯出員工 CSV", 'data-admin-action="exportEmployees"', "ghost")}
      </section>
      <section class="card"><h2>考勤規則</h2>
        <div class="grid four">${input("部門/門市", "ruleDepartment", "三重門市")}${input("上班時間", "ruleStart", "09:00", "time")}${input("下班時間", "ruleEnd", "18:00", "time")}${input("遲到緩衝分鐘", "ruleGrace", "5", "number")}</div>
        ${btn("新增規則", 'data-admin-action="addRule"')} ${btn("產生本月考勤", 'data-admin-action="generateAttendance"', "gold")}
      </section>
      ${table(["員工", "帳號", "部門", "職位", "狀態"], db.hrEmployees.map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.username)}</td><td>${esc(x.department)}</td><td>${esc(x.position)}</td><td>${x.active ? "啟用" : "停用"}</td></tr>`))}
      ${table(["打卡時間", "員工", "部門", "類型", "狀態", "定位"], db.clockRecords.slice(0, 40).map((x) => `<tr><td>${esc(x.clockTime || x.time)}</td><td>${esc(x.employeeName || x.name)}</td><td>${esc(x.department)}</td><td>${esc(x.clockType || x.type)}</td><td>${esc(x.status)}</td><td>${esc([x.latitude, x.longitude].filter(Boolean).join(","))}</td></tr>`))}
      ${table(["補卡日期", "員工", "類型", "時間", "原因", "狀態"], db.punchFixRequests.map((x) => `<tr><td>${esc(x.targetDate)}</td><td>${esc(x.employeeName)}</td><td>${esc(x.clockType)}</td><td>${esc(x.requestedTime)}</td><td>${esc(x.reason)}</td><td>${esc(x.status || "待審核")}</td></tr>`))}
      ${table(["部門", "上班", "下班", "緩衝"], db.attendanceRules.map((x) => `<tr><td>${esc(x.department)}</td><td>${esc(x.workStart)}</td><td>${esc(x.workEnd)}</td><td>${esc(x.lateGrace)} 分</td></tr>`))}
      ${table(["月份", "員工", "出勤", "遲到", "早退", "外勤"], db.monthAttendance.map((x) => `<tr><td>${esc(x.month)}</td><td>${esc(x.employeeName)}</td><td>${x.workDays}</td><td>${x.lateCount}</td><td>${x.earlyLeaveCount}</td><td>${x.fieldCount}</td></tr>`))}
    `);
  }

  function financePage() {
    const db = data();
    const income = db.financeLedger.filter((x) => x.type === "income").reduce((s, x) => s + Number(x.amount || 0), 0);
    const expense = db.financeLedger.filter((x) => x.type === "expense").reduce((s, x) => s + Number(x.amount || 0), 0);
    shell("財務管理", `
      <section class="stats">
        <article><b>${money(income)}</b><span>收入</span></article>
        <article><b>${money(expense)}</b><span>支出</span></article>
        <article><b>${money(income - expense)}</b><span>淨額</span></article>
        <article><b>${db.payrollRecords.length}</b><span>薪資筆數</span></article>
      </section>
      <section class="card"><h2>收支流水</h2>
        <div class="grid four">${input("日期", "ledgerDate", new Date().toISOString().slice(0, 10), "date")}${select("類型", "ledgerType", ["income", "expense"])}${input("分類", "ledgerCategory", "營業收入")}${input("金額", "ledgerAmount", "", "number")}</div>
        ${textarea("備註", "ledgerNote")} ${btn("新增流水", 'data-admin-action="addLedger"')}
      </section>
      <section class="card"><h2>薪資核算</h2>
        <div class="grid four">${input("月份", "payrollMonth", new Date().toISOString().slice(0, 7), "month")}${select("員工", "payrollEmployee", db.hrEmployees.map((x) => x.name))}${input("基本薪資", "baseSalary", "", "number")}${input("獎金/扣款", "payrollAdjust", "0", "number")}</div>
        ${btn("建立薪資資料", 'data-admin-action="addPayroll"', "gold")}
      </section>
      ${table(["日期", "類型", "分類", "金額", "備註"], db.financeLedger.map((x) => `<tr><td>${esc(x.date)}</td><td>${x.type === "income" ? "收入" : "支出"}</td><td>${esc(x.category)}</td><td>${money(x.amount)}</td><td>${esc(x.note)}</td></tr>`))}
      ${table(["月份", "員工", "基礎", "調整", "應發"], db.payrollRecords.map((x) => `<tr><td>${esc(x.month)}</td><td>${esc(x.employeeName)}</td><td>${money(x.baseSalary)}</td><td>${money(x.adjust)}</td><td>${money(x.total)}</td></tr>`))}
    `);
  }

  function operationPage() {
    const db = data();
    shell("庫存管理", `
      <section class="stats">
        <article><b>${db.inventoryItems.length}</b><span>物料</span></article>
        <article><b>${db.inventoryItems.filter((x) => Number(x.qty) <= Number(x.safeStock)).length}</b><span>低庫存</span></article>
        <article><b>${db.purchaseInbound.length}</b><span>入庫單</span></article>
        <article><b>${db.transferOut.length}</b><span>調撥單</span></article>
      </section>
      <section class="card"><h2>物料建檔</h2>
        <div class="grid four">${input("物料名稱", "skuName")}${input("單位", "skuUnit", "瓶")}${input("安全庫存", "skuSafe", "10", "number")}${input("目前數量", "skuQty", "0", "number")}</div>
        ${btn("新增物料", 'data-admin-action="addItem"')}
      </section>
      <section class="card"><h2>採購入庫 / 門市調撥</h2>
        <div class="grid four">${select("物料", "stockItem", db.inventoryItems.map((x) => x.name))}${input("數量", "stockQty", "1", "number")}${input("門市", "stockStore", "三重門市")}${input("備註", "stockNote")}</div>
        ${btn("入庫", 'data-admin-action="addInbound"', "gold")} ${btn("調撥出庫", 'data-admin-action="addTransfer"', "warn")}
      </section>
      ${table(["物料", "單位", "庫存", "安全值", "狀態"], db.inventoryItems.map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.unit)}</td><td>${x.qty}</td><td>${x.safeStock}</td><td>${Number(x.qty) <= Number(x.safeStock) ? "<span class='badge red'>低庫存</span>" : "<span class='badge green'>正常</span>"}</td></tr>`))}
      ${table(["時間", "物料", "數量", "門市", "備註"], db.purchaseInbound.map((x) => `<tr><td>${esc(x.time)}</td><td>${esc(x.itemName)}</td><td>${x.qty}</td><td>${esc(x.store)}</td><td>${esc(x.note)}</td></tr>`))}
      ${table(["時間", "物料", "數量", "門市", "備註"], db.transferOut.map((x) => `<tr><td>${esc(x.time)}</td><td>${esc(x.itemName)}</td><td>${x.qty}</td><td>${esc(x.store)}</td><td>${esc(x.note)}</td></tr>`))}
    `);
  }

  function logsPage() {
    const db = data();
    shell("系統操作日誌", `${btn("匯出日誌 CSV", 'data-admin-action="exportLogs"', "gold")}
      ${table(["時間", "操作人", "模組", "動作", "IP"], db.systemLogs.map((x) => `<tr><td>${esc(x.time)}</td><td>${esc(x.actor)}</td><td>${esc(x.module)}</td><td>${esc(x.action)}</td><td>${esc(x.ip)}</td></tr>`))}`);
  }

  const pages = { rbac: rbacPage, hr: hrPage, finance: financePage, operation: operationPage, logs: logsPage };

  function downloadCsv(name, rows) {
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function run(actionName) {
    const db = data();
    if (actionName === "addAdmin") {
      db.adminAccounts.push({ id: `A${Date.now()}`, username: val("adminUsername"), password: val("adminPassword"), role: val("adminRole"), active: true });
      action("新增管理帳號", "auth", { username: val("adminUsername") });
      return rbacPage();
    }
    if (actionName === "resetAdminPassword") {
      const row = db.adminAccounts.find((x) => x.username === val("resetAccount"));
      if (row) row.password = val("resetPassword");
      action("重置密碼", "auth", { username: val("resetAccount") });
      return rbacPage();
    }
    if (actionName === "addEmployee") {
      db.hrEmployees.push({ id: `E${Date.now()}`, username: val("empUsername"), password: val("empPassword") || "Emp@123456", name: val("empName"), phone: val("empPhone"), department: val("empDepartment"), position: val("empPosition"), role: "EMPLOYEE", active: true });
      action("新增員工", "hr", { name: val("empName") });
      return hrPage();
    }
    if (actionName === "addRule") {
      db.attendanceRules.push({ id: `AR${Date.now()}`, department: val("ruleDepartment"), workStart: val("ruleStart"), workEnd: val("ruleEnd"), lateGrace: num("ruleGrace"), active: true });
      action("新增考勤規則", "hr", { department: val("ruleDepartment") });
      return hrPage();
    }
    if (actionName === "generateAttendance") {
      const month = new Date().toISOString().slice(0, 7);
      db.hrEmployees.forEach((emp) => {
        const records = db.clockRecords.filter((r) => String(r.employeeId) === String(emp.id) && String(r.clockTime || r.time || "").startsWith(month));
        db.monthAttendance = db.monthAttendance.filter((x) => !(x.month === month && x.employeeId === emp.id));
        db.monthAttendance.push({
          id: `MA${Date.now()}${emp.id}`,
          month,
          employeeId: emp.id,
          employeeName: emp.name,
          workDays: new Set(records.map((r) => String(r.clockTime || r.time).slice(0, 10))).size,
          lateCount: records.filter((r) => r.status === "遲到").length,
          earlyLeaveCount: records.filter((r) => r.status === "早退").length,
          fieldCount: records.filter((r) => (r.clockType || r.type) === "FIELD").length
        });
      });
      action("產生月度考勤", "hr", { month });
      return hrPage();
    }
    if (actionName === "addLedger") {
      db.financeLedger.unshift({ id: `FL${Date.now()}`, date: val("ledgerDate"), type: val("ledgerType"), category: val("ledgerCategory"), amount: num("ledgerAmount"), note: val("ledgerNote") });
      action("新增收支流水", "finance", { amount: num("ledgerAmount") });
      return financePage();
    }
    if (actionName === "addPayroll") {
      const base = num("baseSalary");
      const adjust = num("payrollAdjust");
      db.payrollRecords.unshift({ id: `PR${Date.now()}`, month: val("payrollMonth"), employeeName: val("payrollEmployee"), baseSalary: base, adjust, total: base + adjust });
      action("建立薪資資料", "finance", { employee: val("payrollEmployee") });
      return financePage();
    }
    if (actionName === "addItem") {
      db.inventoryItems.push({ id: `SKU${Date.now()}`, name: val("skuName"), unit: val("skuUnit"), safeStock: num("skuSafe"), qty: num("skuQty"), active: true });
      action("新增物料", "operation", { item: val("skuName") });
      return operationPage();
    }
    if (actionName === "addInbound" || actionName === "addTransfer") {
      const item = db.inventoryItems.find((x) => x.name === val("stockItem"));
      if (item) item.qty = Number(item.qty || 0) + (actionName === "addInbound" ? num("stockQty") : -num("stockQty"));
      const row = { id: `ST${Date.now()}`, time: new Date().toLocaleString("zh-TW"), itemName: val("stockItem"), qty: num("stockQty"), store: val("stockStore"), note: val("stockNote") };
      db[actionName === "addInbound" ? "purchaseInbound" : "transferOut"].unshift(row);
      action(actionName === "addInbound" ? "採購入庫" : "調撥出庫", "operation", row);
      return operationPage();
    }
    if (actionName === "exportEmployees") {
      return downloadCsv("employees.csv", [["姓名", "帳號", "電話", "部門", "職位"], ...db.hrEmployees.map((x) => [x.name, x.username, x.phone, x.department, x.position])]);
    }
    if (actionName === "exportLogs") {
      return downloadCsv("system-logs.csv", [["時間", "操作人", "模組", "動作", "IP"], ...db.systemLogs.map((x) => [x.time, x.actor, x.module, x.action, x.ip])]);
    }
  }

  function addEntrances() {
    const db = data();
    if (!db.authed) return;
    const top = document.querySelector(".admin-menu");
    if (top && !top.dataset.adminModules) {
      top.dataset.adminModules = "1";
      top.insertAdjacentHTML("beforeend", `${btn("權限管理", 'data-admin-module="rbac"')}${btn("人資管理", 'data-admin-module="hr"')}${btn("財務管理", 'data-admin-module="finance"')}${btn("庫存管理", 'data-admin-module="operation"')}${btn("系統日誌", 'data-admin-module="logs"')}${btn("快捷按鈕", 'data-shortcut-settings')}`);
    }
    const grid = document.querySelector(".tool-grid");
    if (grid && !grid.dataset.adminModules) {
      grid.dataset.adminModules = "1";
      grid.insertAdjacentHTML("beforeend", `
        <button data-admin-module="hr"><span>人</span><b>人資管理</b><small>員工、考勤、補卡、外勤</small></button>
        <button data-admin-module="finance"><span>財</span><b>財務管理</b><small>流水、薪資、報表</small></button>
        <button data-admin-module="operation"><span>庫</span><b>庫存管理</b><small>物料、入庫、調撥</small></button>
        <button data-admin-module="rbac"><span>權</span><b>權限管理</b><small>管理帳號與角色</small></button>`);
    }
  }

  document.addEventListener("click", (event) => {
    const moduleButton = event.target.closest("[data-admin-module]");
    if (moduleButton) {
      event.preventDefault();
      const page = pages[moduleButton.dataset.adminModule];
      if (page) page();
    }
    const actionButton = event.target.closest("[data-admin-action]");
    if (actionButton) {
      event.preventDefault();
      run(actionButton.dataset.adminAction);
    }
  });

  window.adminModules = pages;
  document.addEventListener("DOMContentLoaded", () => setInterval(addEntrances, 500));
})();
