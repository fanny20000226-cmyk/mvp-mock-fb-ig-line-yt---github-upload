(() => {
  const KEY = "beauty-crm-v10";

  function db() {
    const data = window.db || {};
    data.hrEmployees = data.hrEmployees || [
      { id: "E001", name: "王小明", phone: "0911222333", department: "三重門市", position: "美容技師", role: "普通員工", active: true }
    ];
    data.attendanceRules = data.attendanceRules || [
      { id: "AR001", department: "三重門市", workStart: "09:00", workEnd: "18:00", lateGrace: 5, active: true }
    ];
    data.clockRecords = data.clockRecords || [];
    data.financeLedger = data.financeLedger || [];
    data.payrollRecords = data.payrollRecords || [];
    return data;
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(db()));
  }

  function el(id) { return document.getElementById(id); }
  function value(id) { return (el(id)?.value || "").trim(); }
  function money(n) { return `$${Number(n || 0).toLocaleString("zh-TW")}`; }
  function esc(v) {
    return String(v || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function button(label, attrs = "", cls = "") { return `<button class="${cls}" ${attrs}>${label}</button>`; }
  function field(label, id, val = "", type = "text") {
    return `<div class="field"><label>${label}</label><input id="${id}" type="${type}" value="${esc(val)}"></div>`;
  }
  function select(label, id, items, selected = "") {
    return `<div class="field"><label>${label}</label><select id="${id}">${items.map(item => `<option value="${esc(item)}" ${String(item) === String(selected) ? "selected" : ""}>${esc(item)}</option>`).join("")}</select></div>`;
  }
  function area(label, id, val = "") {
    return `<div class="field"><label>${label}</label><textarea id="${id}">${esc(val)}</textarea></div>`;
  }
  function shell(title, body) {
    if (!db().authed && window.go) return window.go("adminLogin");
    el("app").innerHTML = `<header class="topbar worktop"><div><h1>${title}</h1><small>管理後台 · 人資 / 財務</small></div>${button("回前台", 'data-go="home"', "ghost")}</header>
      <div class="admin-menu">
        ${button("人資管理", 'data-admin-module="hr"')}
        ${button("財務管理", 'data-admin-module="finance"')}
        ${button("員工打卡", 'data-shortcut-url="./employee-mobile/"')}
        ${button("功能按鈕", 'data-shortcut-go="manager"')}
        ${button("總覽", 'data-go="adminHome"')}
      </div>
      <main class="page">${body}</main>`;
  }

  function hrPage() {
    const data = db();
    shell("人資管理", `<section class="stats-grid">
      <article class="card stat-card"><span>員工數</span><strong>${data.hrEmployees.length}</strong></article>
      <article class="card stat-card"><span>考勤規則</span><strong>${data.attendanceRules.length}</strong></article>
      <article class="card stat-card"><span>打卡紀錄</span><strong>${data.clockRecords.length}</strong></article>
      <article class="card stat-card"><span>待審核</span><strong>${data.clockRecords.filter(r => r.auditStatus === "PENDING").length}</strong></article>
    </section>
    <section class="card"><h2>新增員工</h2><section class="grid two">
      ${field("員工編號", "empNo")}
      ${field("姓名", "empName")}
      ${field("電話", "empPhone")}
      ${select("部門", "empDept", ["三重門市", "桃園門市", "新竹門市", "台南門市", "總部"])}
      ${field("職位", "empPosition")}
      ${select("角色", "empRole", ["普通員工", "副店長", "正店長"])}
    </section>${button("新增員工", 'data-admin-action="addEmployee"', "gold")}</section>
    <section class="card"><h2>考勤規則</h2><section class="grid two">
      ${field("規則編號", "ruleId")}
      ${select("適用部門", "ruleDept", ["三重門市", "桃園門市", "新竹門市", "台南門市", "總部"])}
      ${field("上班時間", "ruleStart", "09:00", "time")}
      ${field("下班時間", "ruleEnd", "18:00", "time")}
      ${field("遲到寬限分鐘", "ruleGrace", "5", "number")}
    </section>${button("新增考勤規則", 'data-admin-action="addRule"')}</section>
    <h2>員工列表</h2>${employeeTable(data.hrEmployees)}
    <h2>考勤規則列表</h2>${ruleTable(data.attendanceRules)}`);
  }

  function financePage() {
    const data = db();
    const income = data.financeLedger.filter(x => x.type === "收入").reduce((s, x) => s + Number(x.amount || 0), 0);
    const expense = data.financeLedger.filter(x => x.type === "支出").reduce((s, x) => s + Number(x.amount || 0), 0);
    shell("財務管理", `<section class="stats-grid">
      <article class="card stat-card"><span>收入</span><strong>${money(income)}</strong></article>
      <article class="card stat-card"><span>支出</span><strong>${money(expense)}</strong></article>
      <article class="card stat-card"><span>淨額</span><strong>${money(income - expense)}</strong></article>
      <article class="card stat-card"><span>薪資筆數</span><strong>${data.payrollRecords.length}</strong></article>
    </section>
    <section class="card"><h2>新增收支流水</h2><section class="grid two">
      ${select("類型", "ledgerType", ["收入", "支出"])}
      ${select("分類", "ledgerCategory", ["營業收入", "耗材支出", "薪資支出", "租金", "設備維修", "雜項"])}
      ${field("金額", "ledgerAmount", "", "number")}
      ${select("付款方式", "ledgerPay", ["現金", "匯款", "刷卡", "訂金"])}
      ${field("門市", "ledgerStore", "三重門市")}
      ${area("備註", "ledgerNote")}
    </section>${button("新增流水", 'data-admin-action="addLedger"', "gold")}</section>
    <section class="card"><h2>薪資核算</h2><section class="grid two">
      ${select("員工", "payrollEmp", data.hrEmployees.map(e => `${e.id} ${e.name}`))}
      ${field("月份", "payrollMonth", new Date().toISOString().slice(0, 7), "month")}
      ${field("底薪", "payrollBase", "", "number")}
      ${field("加班費", "payrollOvertime", "0", "number")}
      ${field("扣款", "payrollDeduct", "0", "number")}
    </section>${button("產生薪資", 'data-admin-action="addPayroll"')}</section>
    <h2>收支流水</h2>${ledgerTable(data.financeLedger)}
    <h2>薪資紀錄</h2>${payrollTable(data.payrollRecords)}`);
  }

  function employeeTable(rows) {
    return `<section class="table-wrap"><table><thead><tr><th>編號</th><th>姓名</th><th>電話</th><th>部門</th><th>職位</th><th>角色</th></tr></thead><tbody>${rows.map(e => `<tr><td>${esc(e.id)}</td><td>${esc(e.name)}</td><td>${esc(e.phone)}</td><td>${esc(e.department)}</td><td>${esc(e.position)}</td><td>${esc(e.role)}</td></tr>`).join("")}</tbody></table></section>`;
  }
  function ruleTable(rows) {
    return `<section class="table-wrap"><table><thead><tr><th>編號</th><th>部門</th><th>上班</th><th>下班</th><th>寬限</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.id)}</td><td>${esc(r.department)}</td><td>${esc(r.workStart)}</td><td>${esc(r.workEnd)}</td><td>${esc(r.lateGrace)} 分</td></tr>`).join("")}</tbody></table></section>`;
  }
  function ledgerTable(rows) {
    return `<section class="table-wrap"><table><thead><tr><th>日期</th><th>類型</th><th>分類</th><th>門市</th><th>金額</th><th>備註</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.date)}</td><td>${esc(r.type)}</td><td>${esc(r.category)}</td><td>${esc(r.store)}</td><td>${money(r.amount)}</td><td>${esc(r.note)}</td></tr>`).join("")}</tbody></table></section>`;
  }
  function payrollTable(rows) {
    return `<section class="table-wrap"><table><thead><tr><th>月份</th><th>員工</th><th>底薪</th><th>加班</th><th>扣款</th><th>實領</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(r.month)}</td><td>${esc(r.employee)}</td><td>${money(r.base)}</td><td>${money(r.overtime)}</td><td>${money(r.deduct)}</td><td>${money(r.net)}</td></tr>`).join("")}</tbody></table></section>`;
  }

  function addEmployee() {
    db().hrEmployees.unshift({ id: value("empNo") || `E${Date.now()}`, name: value("empName"), phone: value("empPhone"), department: value("empDept"), position: value("empPosition"), role: value("empRole"), active: true });
    save(); hrPage();
  }
  function addRule() {
    db().attendanceRules.unshift({ id: value("ruleId") || `AR${Date.now()}`, department: value("ruleDept"), workStart: value("ruleStart"), workEnd: value("ruleEnd"), lateGrace: Number(value("ruleGrace") || 0), active: true });
    save(); hrPage();
  }
  function addLedger() {
    db().financeLedger.unshift({ id: `L${Date.now()}`, date: new Date().toISOString().slice(0, 10), type: value("ledgerType"), category: value("ledgerCategory"), amount: Number(value("ledgerAmount") || 0), pay: value("ledgerPay"), store: value("ledgerStore"), note: value("ledgerNote") });
    save(); financePage();
  }
  function addPayroll() {
    const base = Number(value("payrollBase") || 0);
    const overtime = Number(value("payrollOvertime") || 0);
    const deduct = Number(value("payrollDeduct") || 0);
    db().payrollRecords.unshift({ id: `P${Date.now()}`, month: value("payrollMonth"), employee: value("payrollEmp"), base, overtime, deduct, net: base + overtime - deduct });
    save(); financePage();
  }

  function enhance() {
    const menu = document.querySelector(".admin-menu");
    if (menu && !menu.querySelector('[data-admin-module="hr"]')) {
      menu.insertAdjacentHTML("afterbegin", '<button data-admin-module="hr">人資管理</button><button data-admin-module="finance">財務管理</button>');
    }
    const grid = document.querySelector(".tool-grid");
    if (grid && db().authed && !grid.querySelector('[data-admin-module="hr"]')) {
      grid.insertAdjacentHTML("beforeend", '<button class="tool" data-admin-module="hr"><strong>人</strong><span>人資管理</span></button><button class="tool" data-admin-module="finance"><strong>財</strong><span>財務管理</span></button>');
    }
  }

  document.addEventListener("click", event => {
    const module = event.target.closest("[data-admin-module]");
    if (module) {
      event.preventDefault();
      event.stopImmediatePropagation();
      module.dataset.adminModule === "hr" ? hrPage() : financePage();
      return;
    }
    const action = event.target.closest("[data-admin-action]");
    if (!action) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    ({ addEmployee, addRule, addLedger, addPayroll }[action.dataset.adminAction] || (() => {}))();
  }, true);

  let runs = 0;
  const timer = setInterval(() => { enhance(); runs += 1; if (runs > 20) clearInterval(timer); }, 300);
  document.addEventListener("click", () => setTimeout(enhance, 80), true);
  setTimeout(enhance, 100);
})();
