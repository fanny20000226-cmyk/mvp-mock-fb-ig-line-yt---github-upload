(() => {
  const KEY = "beauty-crm-v10";
  const SESSION_KEY = "beauty-crm-module-unlocks";
  const PASSWORDS = {
    master: "boss8888",
    operations: "op1234",
    finance: "boss1688",
    hr: "hr1688",
    managerExpense: "store1688"
  };
  const PAY_TYPES = ["現金", "匯款", "刷卡"];
  const EXPENSE_TYPES = ["藥水耗材", "耗材物料", "設備維修", "房租", "人工", "雜項開支"];

  const CATEGORIES = [
    {
      id: "management",
      title: "管理總覽",
      icon: "總",
      role: "master",
      passwordLabel: "最高大權限密碼",
      desc: "系統基礎、價目與庫存設定",
      items: [
        { title: "基礎配置", icon: "基", type: "go", target: "config" },
        { title: "價目管理", icon: "價", type: "go", target: "prices" },
        { title: "庫存管理", icon: "庫", type: "admin", target: "operation" }
      ]
    },
    {
      id: "operations",
      title: "運營管理",
      icon: "營",
      role: "operations",
      passwordLabel: "小權限密碼",
      desc: "日常預約、訂單、施工與客戶",
      items: [
        { title: "施工人員", icon: "施", type: "go", target: "workers" },
        { title: "訂單管理", icon: "訂", type: "go", target: "orders" },
        { title: "行事曆", icon: "曆", type: "go", target: "calendar" },
        { title: "客戶管理", icon: "客", type: "go", target: "customers" },
        { title: "取消列表", icon: "取", type: "menu", target: "cancelAdmin" }
      ]
    },
    {
      id: "finance",
      title: "財務管理",
      icon: "財",
      role: "finance",
      passwordLabel: "獨立財務密碼",
      desc: "報表、收款、流水與店長支出審核",
      items: [
        { title: "財務報表", icon: "報", type: "go", target: "reports" },
        { title: "收款核銷", icon: "收", type: "finance", target: "checkout" },
        { title: "營收報表", icon: "營", type: "finance", target: "revenue" },
        { title: "收款流水帳", icon: "流", type: "finance", target: "payments" },
        { title: "正副店長支出審核", icon: "審", type: "managerExpenseReview", target: "review" }
      ]
    },
    {
      id: "permission",
      title: "權限管理",
      icon: "權",
      role: "master",
      passwordLabel: "最高大權限密碼",
      desc: "品牌、菜單、日誌與按鈕排序",
      items: [
        { title: "品牌設定", icon: "色", type: "brand", target: "settings" },
        { title: "菜單管理", icon: "菜", type: "menu", target: "menuAdmin" },
        { title: "系統日誌", icon: "誌", type: "admin", target: "logs" },
        { title: "新增/排序按鈕", icon: "排", type: "screen", target: "manager" },
        { title: "快捷設定", icon: "快", type: "shortcut", target: "settings" }
      ]
    },
    {
      id: "hr",
      title: "人資管理",
      icon: "人",
      role: "hr",
      passwordLabel: "獨立人資密碼",
      desc: "員工打卡與人員資料",
      items: [
        { title: "出勤打卡", icon: "卡", type: "url", target: "./employee-mobile/" },
        { title: "人員資料", icon: "員", type: "admin", target: "hr" }
      ]
    }
  ];

  function db() {
    const data = window.db || JSON.parse(localStorage.getItem(KEY) || "{}");
    data.storeExpenseRequests ||= [];
    data.financeLedger ||= [];
    data.systemLogs ||= [];
    data.permissionPasswords ||= { ...PASSWORDS };
    data.permissionPasswords.master = "boss8888";
    data.permissionPasswords.operations ||= PASSWORDS.operations;
    data.permissionPasswords.finance ||= PASSWORDS.finance;
    data.permissionPasswords.hr ||= PASSWORDS.hr;
    data.permissionPasswords.managerExpense ||= PASSWORDS.managerExpense;
    window.db = data;
    return data;
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(db())); }
  function esc(value) { return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char])); }
  function unlocks() {
    const fromSession = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
    return { ...(db().moduleUnlocks || {}), ...fromSession };
  }
  function setUnlock(role) {
    const state = unlocks();
    state[role] = true;
    if (role === "master") CATEGORIES.forEach((category) => state[category.role] = true);
    db().moduleUnlocks = state;
    save();
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  }
  function canAccess(role) {
    const state = unlocks();
    return Boolean(state.master || state[role]);
  }
  function actionAttrs(item) {
    if (item.type === "go") return `data-go="${esc(item.target)}"`;
    if (item.type === "admin") return `data-admin-module="${esc(item.target)}"`;
    if (item.type === "finance") return `data-finance-page="${esc(item.target)}"`;
    if (item.type === "menu") return `data-menu-action="${esc(item.target)}"`;
    if (item.type === "brand") return "data-brand-open=\"1\"";
    if (item.type === "screen") return "data-screen-manager";
    if (item.type === "shortcut") return "data-shortcut-settings";
    if (item.type === "url") return `data-manager-url="${esc(item.target)}"`;
    if (item.type === "managerExpenseReview") return "data-manager-expense-review";
    return "";
  }
  function categoryHtml(category) {
    const opened = canAccess(category.role);
    return `<article class="module-category-card ${opened ? "is-open" : ""}" data-category-id="${esc(category.id)}">
      <button class="module-category-head" data-category-open="${esc(category.id)}">
        <span>${esc(category.icon)}</span>
        <b>${esc(category.title)}</b>
        <small>${esc(category.passwordLabel)}</small>
        <em>${esc(category.desc)}</em>
      </button>
      <div class="module-category-actions">
        ${category.items.map((item) => `<button ${actionAttrs(item)}><span>${esc(item.icon)}</span><b>${esc(item.title)}</b></button>`).join("")}
      </div>
    </article>`;
  }
  function renderAdminDashboard() {
    const data = db();
    document.body.classList.toggle("module-dashboard-mode", Boolean(data.authed && data.view === "adminHome"));
    if (!data.authed || data.view !== "adminHome") return;
    const grid = document.querySelector(".tool-grid, .module-category-grid");
    if (!grid) return;
    window.categoryDashboardActive = true;
    grid.dataset.screenSignature = "category-dashboard";
    const signature = `cat:${JSON.stringify(unlocks())}:${data.storeExpenseRequests.length}`;
    if (grid.dataset.categorySignature === signature) return;
    grid.dataset.categorySignature = signature;
    grid.className = "module-category-grid";
    grid.innerHTML = CATEGORIES.map(categoryHtml).join("");
  }
  function showPasswordModal(categoryId, role, label, afterUnlock) {
    closeModal();
    document.body.insertAdjacentHTML("beforeend", `<div class="module-modal" data-module-modal>
      <section class="module-modal-card">
        <h2>${esc(label)}</h2>
        <p class="muted">請輸入密碼解鎖此分類。最高大權限可進入全部模組。</p>
        <input id="modulePasswordInput" type="password" placeholder="請輸入密碼" autocomplete="current-password">
        <div class="row"><button data-module-password-ok="${esc(categoryId)}" data-role="${esc(role)}">確認進入</button><button class="ghost" data-module-modal-close>取消</button></div>
      </section>
    </div>`);
    document.querySelector("[data-module-password-ok]")?.addEventListener("click", () => {
      const input = document.getElementById("modulePasswordInput")?.value || "";
      const passwords = db().permissionPasswords || PASSWORDS;
      if (input === passwords.master) {
        setUnlock("master");
      } else if (input === passwords[role]) {
        setUnlock(role);
      } else {
        alert("密碼錯誤，無法進入此模組。");
        return;
      }
      closeModal();
      if (afterUnlock) afterUnlock();
      if (unlocks().master) {
        document.querySelectorAll(".module-category-card").forEach((card) => card.classList.add("is-open"));
      } else {
        document.querySelector(`[data-category-id="${categoryId}"]`)?.classList.add("is-open");
      }
      renderAdminDashboard();
    }, { once: true });
  }
  function closeModal() {
    document.querySelectorAll("[data-module-modal]").forEach((node) => node.remove());
  }
  function pageShell(title, body, back = "adminHome") {
    document.getElementById("app").innerHTML = `<header class="topbar worktop"><div><h1>${esc(title)}</h1><small>正副店長支出 · 財務串聯</small></div><button data-go="${esc(back)}" class="ghost">返回</button></header><main class="page">${body}</main>`;
  }
  function frontExpenseLogin() {
    document.getElementById("app").innerHTML = `<header class="topbar worktop"><div><h1>正副店長支出入口</h1><small>僅限正副店長填報支出</small></div><button data-go="home" class="ghost">回首頁</button></header>
      <main class="page"><section class="card login-card">
        <p>請輸入正副店長專屬密碼</p>
        <input id="managerExpensePassword" type="password" placeholder="請輸入密碼">
        <button data-manager-expense-login>登入填報</button>
      </section></main>`;
  }
  function frontExpensePage() {
    const data = db();
    const rows = data.storeExpenseRequests.map((item) => `<tr><td>${esc(item.store)}</td><td>${esc(item.expenseDate)}</td><td>${esc(item.type)}</td><td>$${Number(item.amount || 0).toLocaleString("zh-TW")}</td><td>${esc(item.status)}</td><td>${esc(item.note)}</td></tr>`).join("");
    document.getElementById("app").innerHTML = `<header class="topbar worktop"><div><h1>正副店長支出填報</h1><small>送出後進入財務審核</small></div><button data-go="home" class="ghost">回首頁</button></header>
      <main class="page">
        <section class="card">
          <h2>新增支出申請</h2>
          <div class="grid two">
            ${selectField("所屬門市", "mgrStore", ["三重", "桃園", "新竹", "台南"])}
            <div class="field"><label>支出日期</label><input id="mgrDate" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
            ${selectField("支出類型", "mgrType", EXPENSE_TYPES)}
            <div class="field"><label>金額</label><input id="mgrAmount" type="number" min="0" step="1"></div>
            ${selectField("付款方式", "mgrPay", PAY_TYPES)}
            <div class="field"><label>申請人</label><input id="mgrApplicant" placeholder="正店長 / 副店長姓名"></div>
          </div>
          <div class="field"><label>附件上傳（發票照片）</label><input id="mgrFile" type="file" accept="image/*"></div>
          <div class="field"><label>備註</label><textarea id="mgrNote"></textarea></div>
          <button data-manager-expense-submit>提交支出申請</button>
        </section>
        <section class="table-wrap"><table><thead><tr><th>門市</th><th>日期</th><th>類型</th><th>金額</th><th>狀態</th><th>備註</th></tr></thead><tbody>${rows}</tbody></table></section>
      </main>`;
  }
  function selectField(label, id, items) {
    return `<div class="field"><label>${esc(label)}</label><select id="${esc(id)}">${items.map((item) => `<option value="${esc(item)}">${esc(item)}</option>`).join("")}</select></div>`;
  }
  function value(id) { return (document.getElementById(id)?.value || "").trim(); }
  function submitManagerExpense() {
    const file = document.getElementById("mgrFile")?.files?.[0];
    const item = {
      id: `EXP${Date.now()}`,
      store: value("mgrStore"),
      expenseDate: value("mgrDate"),
      type: value("mgrType"),
      amount: Number(value("mgrAmount") || 0),
      payMethod: value("mgrPay"),
      applicant: value("mgrApplicant") || "正副店長",
      note: value("mgrNote"),
      attachmentName: file?.name || "",
      status: "待審核",
      rejectReason: "",
      createdAt: new Date().toISOString()
    };
    if (!item.amount) return alert("請輸入支出金額。");
    db().storeExpenseRequests.unshift(item);
    db().systemLogs.unshift({ id: `LOG${Date.now()}`, actor: item.applicant, action: "提交店長支出", module: "finance", time: new Date().toLocaleString("zh-TW") });
    save();
    alert("支出申請已送出，等待財務審核。");
    frontExpensePage();
  }
  function reviewPage() {
    const data = db();
    const rows = data.storeExpenseRequests.map((item) => `<tr>
      <td>${esc(item.store)}</td><td>${esc(item.applicant)}</td><td>${esc(item.expenseDate)}</td><td>${esc(item.type)}</td>
      <td>$${Number(item.amount || 0).toLocaleString("zh-TW")}</td><td>${esc(item.payMethod)}</td><td>${esc(item.attachmentName || "-")}</td><td>${esc(item.status)}</td>
      <td>${esc(item.rejectReason || item.note || "-")}</td>
      <td><button data-expense-approve="${esc(item.id)}">核准</button><button class="danger-btn" data-expense-reject="${esc(item.id)}">駁回</button><button class="ghost" data-expense-clear="${esc(item.id)}">已核銷</button></td>
    </tr>`).join("");
    pageShell("正副店長支出審核", `<section class="table-wrap"><table><thead><tr><th>門市</th><th>申請人</th><th>支出日期</th><th>類型</th><th>金額</th><th>付款</th><th>附件</th><th>狀態</th><th>備註/原因</th><th>操作</th></tr></thead><tbody>${rows || `<tr><td colspan="10">目前沒有支出申請</td></tr>`}</tbody></table></section>`);
  }
  function findExpense(id) {
    return db().storeExpenseRequests.find((item) => item.id === id);
  }
  function approveExpense(id) {
    const item = findExpense(id);
    if (!item) return;
    item.status = "核准通過";
    db().financeLedger.unshift({ id: `FL${Date.now()}`, date: item.expenseDate, type: "expense", category: item.type, amount: Number(item.amount || 0), note: `店長支出：${item.store} ${item.note || ""}`, store: item.store, sourceId: item.id });
    save();
    reviewPage();
  }
  function rejectExpense(id) {
    const item = findExpense(id);
    if (!item) return;
    const reason = prompt("請輸入駁回原因") || "";
    item.status = "核准駁回";
    item.rejectReason = reason;
    save();
    reviewPage();
  }
  function clearExpense(id) {
    const item = findExpense(id);
    if (!item) return;
    item.status = "已核銷";
    save();
    reviewPage();
  }
  function addFrontExpenseEntry() {
    const data = db();
    if (data.view !== "home") return;
    const grid = document.querySelector(".tool-grid");
    if (!grid || grid.querySelector("[data-manager-expense-entry]")) return;
    grid.insertAdjacentHTML("beforeend", `<button data-manager-expense-entry><span>支</span><b>店長支出</b></button>`);
  }
  document.addEventListener("click", (event) => {
    const categoryButton = event.target.closest("[data-category-open]");
    if (categoryButton) {
      const category = CATEGORIES.find((item) => item.id === categoryButton.dataset.categoryOpen);
      if (!category) return;
      if (canAccess(category.role)) return;
      showPasswordModal(category.id, category.role, category.passwordLabel, null);
    }
    if (event.target.closest("[data-module-modal-close]")) closeModal();
    if (event.target.closest("[data-manager-expense-entry]")) frontExpenseLogin();
    if (event.target.closest("[data-manager-expense-login]")) {
      const pass = value("managerExpensePassword");
      const passwords = db().permissionPasswords || PASSWORDS;
      if (pass !== passwords.managerExpense && pass !== passwords.master) return alert("密碼錯誤，無法進入支出填報。");
      sessionStorage.setItem("manager-expense-unlocked", "1");
      frontExpensePage();
    }
    if (event.target.closest("[data-manager-expense-submit]")) submitManagerExpense();
    if (event.target.closest("[data-manager-expense-review]")) {
      if (!canAccess("finance")) return showPasswordModal("finance", "finance", "獨立財務密碼", reviewPage);
      reviewPage();
    }
    const approve = event.target.closest("[data-expense-approve]");
    if (approve) approveExpense(approve.dataset.expenseApprove);
    const reject = event.target.closest("[data-expense-reject]");
    if (reject) rejectExpense(reject.dataset.expenseReject);
    const clear = event.target.closest("[data-expense-clear]");
    if (clear) clearExpense(clear.dataset.expenseClear);
    const url = event.target.closest("[data-manager-url]");
    if (url) location.href = url.dataset.managerUrl;
  });
  document.addEventListener("DOMContentLoaded", () => setInterval(() => {
    renderAdminDashboard();
    addFrontExpenseEntry();
  }, 450));
  window.modulePermissionDashboard = { renderAdminDashboard, frontExpensePage, reviewPage };
})();
