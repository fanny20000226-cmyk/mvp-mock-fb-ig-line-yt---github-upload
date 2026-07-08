(() => {
  const KEY = "beauty-crm-v10";
  const PAY_TYPES = [
    ["1", "現金"],
    ["2", "匯款"],
    ["3", "刷卡POS"],
    ["4", "微信"],
    ["5", "支付寶"],
    ["6", "儲值抵扣"],
    ["7", "對公轉帳"],
    ["8", "掛帳賒帳"]
  ];

  function db() {
    const data = window.db || JSON.parse(localStorage.getItem(KEY) || "{}");
    data.orders ||= [];
    data.paymentRecords ||= [];
    data.systemLogs ||= [];
    data.orders.forEach((order) => normalizeOrder(order, true));
    window.db = data;
    return data;
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(db())); }
  function esc(v) { return String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function el(id) { return document.getElementById(id); }
  function val(id) { return (el(id)?.value || "").trim(); }
  function num(id) { return Number(val(id) || 0); }
  function money(v) { return `$${Number(v || 0).toLocaleString("zh-TW")}`; }
  function planPrice(order) {
    const cfg = db().cfg || {};
    const plan = (cfg.plans || []).find((item) => item.id === order.plan);
    const addons = (order.addons || []).reduce((sum, id) => {
      const add = (cfg.addons || []).find((item) => item.id === id);
      return sum + Number(add?.price || 0);
    }, 0);
    return Number(plan?.price || 0) + addons;
  }
  function normalizeOrder(order, historical = false) {
    order.order_source ??= 1;
    order.original_total ??= planPrice(order);
    order.discount_amount ??= 0;
    order.deposit_amount ??= 0;
    order.refund_total ??= 0;
    order.tax_exclusive ??= 0;
    order.tax_amount ??= 0;
    order.invoice_status ??= 0;
    order.invoice_no ??= "";
    order.check_status ??= historical ? 1 : 0;
    order.check_uid ??= "";
    order.finish_time ??= "";
    return order;
  }
  function orderPaid(orderId) {
    return db().paymentRecords.filter((x) => x.order_primary_id === orderId).reduce((sum, row) => sum + Number(row.pay_amount || 0), 0);
  }
  function netDue(order) {
    normalizeOrder(order);
    return Number(order.original_total || 0) - Number(order.discount_amount || 0) - Number(order.refund_total || 0);
  }
  function remaining(order) {
    return netDue(order) - orderPaid(order.id);
  }
  function payName(type) {
    return PAY_TYPES.find(([id]) => String(id) === String(type))?.[1] || "-";
  }
  function checkName(status) {
    return { 0: "待對帳", 1: "已對帳", 2: "異常待核查" }[status] || "待對帳";
  }
  function field(label, id, value = "", type = "text") {
    return `<div class="field"><label>${label}</label><input id="${id}" type="${type}" value="${esc(value)}"></div>`;
  }
  function select(label, id, items, selected = "") {
    return `<div class="field"><label>${label}</label><select id="${id}">${items.map(([value, text]) => `<option value="${esc(value)}" ${String(value) === String(selected) ? "selected" : ""}>${esc(text)}</option>`).join("")}</select></div>`;
  }
  function appShell(title, body) {
    if (!db().authed && window.go) return window.go("adminLogin");
    el("app").innerHTML = `<header class="topbar worktop"><div><h1>${title}</h1><small>財務管理 · 收款對帳</small></div><button data-admin-module="finance" class="ghost">回財務</button></header><main class="page">${body}</main>`;
  }
  function financeNav() {
    return `<section class="finance-nav-card">
      <button data-finance-page="checkout"><span>收</span><b>訂單收款核銷</b></button>
      <button data-finance-page="revenue"><span>報</span><b>門店營收報表</b></button>
      <button data-finance-page="payments"><span>流</span><b>收款流水查詢</b></button>
    </section>`;
  }
  function orderRows(list) {
    return list.map((order) => `<tr>
      <td>${esc(order.id)}<br><span class="muted">${Number(order.order_source) === 1 ? "前台預約" : "後台預約"}</span></td>
      <td>${esc(order.name)}<br>${esc(order.phone)}<br>${esc(order.plate)}</td>
      <td>${esc(order.date)} ${esc(order.time)}<br>${esc(order.store)}</td>
      <td>${money(order.original_total)}<br><span class="muted">優惠 ${money(order.discount_amount)}</span></td>
      <td>${money(orderPaid(order.id))}<br><span class="muted">尾款 ${money(remaining(order))}</span></td>
      <td>${checkName(order.check_status)}</td>
      <td><button data-finance-settle="${esc(order.id)}">結算</button><button class="danger-btn" data-finance-refund="${esc(order.id)}">退款</button><button class="ghost" data-finance-check="${esc(order.id)}">對帳</button></td>
    </tr>`).join("");
  }
  function checkoutPage() {
    const keyword = val("financeKeyword");
    const list = db().orders.filter((order) => !keyword || [order.id, order.phone, order.plate, order.name].join(" ").includes(keyword));
    appShell("訂單收款核銷", `${financeNav()}
      <section class="card row">${field("搜尋：單號 / 手機 / 車牌", "financeKeyword", keyword)}<button data-finance-page="checkout">查詢</button></section>
      <section class="table-wrap"><table><thead><tr><th>預約單</th><th>客戶</th><th>排程</th><th>應收</th><th>實收/尾款</th><th>對帳</th><th>操作</th></tr></thead><tbody>${orderRows(list)}</tbody></table></section>
      <div id="financeDialog"></div>`);
  }
  function showSettle(orderId) {
    const order = db().orders.find((x) => x.id === orderId);
    if (!order) return;
    normalizeOrder(order);
    el("financeDialog").innerHTML = `<section class="modal-card finance-modal">
      <h2>訂單結算：${esc(order.id)}</h2>
      <div class="grid four">${field("原價總金額", "settleOriginal", order.original_total, "number")}${field("優惠/抹零", "settleDiscount", order.discount_amount, "number")}${field("本次收款", "settleAmount", Math.max(remaining(order), 0), "number")}${select("付款方式", "settlePayType", PAY_TYPES)}</div>
      <div class="grid two">${field("交易單號", "settleTradeSn")}${field("備註", "settleRemark")}</div>
      <p class="muted">目前累計實收 ${money(orderPaid(order.id))}，剩餘尾款 ${money(remaining(order))}。所有金額由系統重新計算。</p>
      <button data-finance-save-settle="${esc(order.id)}">儲存收款</button>
      <button class="ghost" data-finance-page="checkout">取消</button>
    </section>`;
  }
  function saveSettle(orderId) {
    const dataRef = db();
    const order = dataRef.orders.find((x) => x.id === orderId);
    if (!order || Number(order.check_status) === 1) return alert("已對帳訂單不可修改。");
    order.original_total = num("settleOriginal");
    order.discount_amount = num("settleDiscount");
    const amount = num("settleAmount");
    if (amount <= 0) return alert("請輸入本次收款金額。");
    dataRef.paymentRecords.unshift({
      id: `PAY${Date.now()}`,
      order_primary_id: order.id,
      store_id: storeId(order.store),
      store: order.store,
      pay_type: Number(val("settlePayType")),
      pay_amount: amount,
      trade_sn: val("settleTradeSn"),
      pay_time: new Date().toISOString(),
      operator_id: 1,
      remark: val("settleRemark")
    });
    order.deposit_amount = Math.max(Number(order.deposit_amount || 0), amount);
    order.check_status = 0;
    save();
    checkoutPage();
  }
  function showRefund(orderId) {
    const order = db().orders.find((x) => x.id === orderId);
    if (!order) return;
    el("financeDialog").innerHTML = `<section class="modal-card finance-modal">
      <h2>退款處理：${esc(order.id)}</h2>
      <div class="grid three">${field("退款金額", "refundAmount", "", "number")}${select("退款方式", "refundPayType", PAY_TYPES)}${field("交易單號", "refundTradeSn")}</div>
      ${field("退款備註", "refundRemark")}
      <button class="danger-btn" data-finance-save-refund="${esc(order.id)}">確認退款</button>
      <button class="ghost" data-finance-page="checkout">取消</button>
    </section>`;
  }
  function saveRefund(orderId) {
    const dataRef = db();
    const order = dataRef.orders.find((x) => x.id === orderId);
    if (!order || Number(order.check_status) === 1) return alert("已對帳訂單不可直接退款，請先由財務解鎖。");
    const amount = Math.abs(num("refundAmount"));
    if (!amount) return alert("請輸入退款金額。");
    order.refund_total = Number(order.refund_total || 0) + amount;
    order.check_status = 2;
    dataRef.paymentRecords.unshift({
      id: `PAY${Date.now()}`,
      order_primary_id: order.id,
      store_id: storeId(order.store),
      store: order.store,
      pay_type: Number(val("refundPayType")),
      pay_amount: -amount,
      trade_sn: val("refundTradeSn"),
      pay_time: new Date().toISOString(),
      operator_id: 1,
      remark: val("refundRemark") || "退款"
    });
    save();
    checkoutPage();
  }
  function approve(orderId) {
    const order = db().orders.find((x) => x.id === orderId);
    if (!order) return;
    if (!confirm(`確認訂單 ${orderId} 對帳無誤？`)) return;
    order.check_status = 1;
    order.check_uid = 1;
    order.finish_time = order.finish_time || new Date().toISOString();
    db().systemLogs.unshift({ id: `LOG${Date.now()}`, actor: "finance", action: "對帳審核", module: "finance", time: new Date().toLocaleString("zh-TW") });
    save();
    checkoutPage();
  }
  function storeId(store) {
    return { "三重": 1, "桃園": 2, "新竹": 3, "台南": 4, "台北": 5, "台中": 6, "高雄": 7 }[store] || 0;
  }
  function filteredPayments() {
    const store = val("reportStore");
    const start = val("reportStart");
    const end = val("reportEnd");
    const pay = val("reportPay");
    return db().paymentRecords.filter((row) => (!store || row.store === store) && (!pay || String(row.pay_type) === pay) && (!start || row.pay_time.slice(0, 10) >= start) && (!end || row.pay_time.slice(0, 10) <= end));
  }
  function revenuePage() {
    const stores = [...new Set(["", "三重", "桃園", "新竹", "台南", ...(db().orders || []).map((x) => x.store).filter(Boolean)])];
    const rows = summarize(filteredPayments());
    appShell("門店營收報表", `${financeNav()}
      <section class="card row">
        ${select("門店", "reportStore", stores.map((x) => [x, x || "全部門店"]), val("reportStore"))}
        ${field("起始日期", "reportStart", val("reportStart"), "date")}
        ${field("結束日期", "reportEnd", val("reportEnd"), "date")}
        ${select("付款方式", "reportPay", [["", "全部"], ...PAY_TYPES], val("reportPay"))}
        <button data-finance-page="revenue">篩選</button><button data-finance-export="revenue">匯出</button>
      </section>
      <section class="table-wrap"><table><thead><tr><th>門店</th><th>訂金/收款</th><th>刷卡</th><th>匯款</th><th>現金</th><th>退款</th><th>店長支出</th><th>淨營收</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.store)}</td><td>${money(r.total)}</td><td>${money(r.card)}</td><td>${money(r.transfer)}</td><td>${money(r.cash)}</td><td>${money(r.refund)}</td><td>${money(r.managerExpense)}</td><td>${money(r.net)}</td></tr>`).join("")}</tbody></table></section>`);
  }
  function summarize(payments) {
    const map = {};
    payments.forEach((row) => {
      const key = row.store || "未指定";
      map[key] ||= { store: key, total: 0, card: 0, transfer: 0, cash: 0, refund: 0, managerExpense: 0, net: 0 };
      const amount = Number(row.pay_amount || 0);
      map[key].total += amount > 0 ? amount : 0;
      map[key].refund += amount < 0 ? Math.abs(amount) : 0;
      map[key].net += amount;
      if (Number(row.pay_type) === 1) map[key].cash += amount;
      if ([2, 7].includes(Number(row.pay_type))) map[key].transfer += amount;
      if (Number(row.pay_type) === 3) map[key].card += amount;
    });
    const start = val("reportStart");
    const end = val("reportEnd");
    const storeFilter = val("reportStore");
    (db().storeExpenseRequests || []).filter((item) => {
      const day = String(item.expenseDate || "");
      return ["核准通過", "已核銷"].includes(item.status) && (!storeFilter || item.store === storeFilter) && (!start || day >= start) && (!end || day <= end);
    }).forEach((item) => {
      const store = item.store || "未指定";
      map[store] ||= { store, total: 0, card: 0, transfer: 0, cash: 0, refund: 0, managerExpense: 0, net: 0 };
      const amount = Number(item.amount || 0);
      map[store].managerExpense += amount;
      map[store].net -= amount;
    });
    return Object.values(map);
  }
  function paymentsPage() {
    const rows = filteredPayments();
    appShell("收款流水查詢", `${financeNav()}
      <section class="card row">
        ${field("起始日期", "reportStart", val("reportStart"), "date")}
        ${field("結束日期", "reportEnd", val("reportEnd"), "date")}
        ${select("付款方式", "reportPay", [["", "全部"], ...PAY_TYPES], val("reportPay"))}
        <button data-finance-page="payments">查詢</button><button data-finance-export="payments">匯出</button>
      </section>
      <section class="table-wrap"><table><thead><tr><th>時間</th><th>訂單</th><th>門店</th><th>方式</th><th>金額</th><th>交易單號</th><th>備註</th></tr></thead><tbody>${rows.map((x) => `<tr><td>${new Date(x.pay_time).toLocaleString("zh-TW")}</td><td>${esc(x.order_primary_id)}</td><td>${esc(x.store)}</td><td>${payName(x.pay_type)}</td><td>${money(x.pay_amount)}</td><td>${esc(x.trade_sn)}</td><td>${esc(x.remark)}</td></tr>`).join("")}</tbody></table></section>`);
  }
  function exportCsv(kind) {
    const rows = kind === "payments"
      ? [["時間", "訂單", "門店", "方式", "金額", "交易單號", "備註"], ...filteredPayments().map((x) => [x.pay_time, x.order_primary_id, x.store, payName(x.pay_type), x.pay_amount, x.trade_sn, x.remark])]
      : [["門店", "收款", "刷卡", "匯款", "現金", "退款", "店長支出", "淨營收"], ...summarize(filteredPayments()).map((x) => [x.store, x.total, x.card, x.transfer, x.cash, x.refund, x.managerExpense, x.net])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${kind}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function addEntrances() {
    const financePageVisible = document.querySelector("h1")?.textContent?.includes("財務") || document.getElementById("ledgerDate") || document.getElementById("payrollMonth");
    if (financePageVisible && !document.querySelector(".finance-nav-card")) {
      document.querySelector("main.page")?.insertAdjacentHTML("afterbegin", financeNav());
    }
  }
  document.addEventListener("click", (event) => {
    const pageButton = event.target.closest("[data-finance-page]");
    if (pageButton) {
      event.preventDefault();
      ({ checkout: checkoutPage, revenue: revenuePage, payments: paymentsPage }[pageButton.dataset.financePage] || checkoutPage)();
    }
    const settle = event.target.closest("[data-finance-settle]");
    if (settle) showSettle(settle.dataset.financeSettle);
    const saveSettleButton = event.target.closest("[data-finance-save-settle]");
    if (saveSettleButton) saveSettle(saveSettleButton.dataset.financeSaveSettle);
    const refund = event.target.closest("[data-finance-refund]");
    if (refund) showRefund(refund.dataset.financeRefund);
    const saveRefundButton = event.target.closest("[data-finance-save-refund]");
    if (saveRefundButton) saveRefund(saveRefundButton.dataset.financeSaveRefund);
    const check = event.target.closest("[data-finance-check]");
    if (check) approve(check.dataset.financeCheck);
    const exportButton = event.target.closest("[data-finance-export]");
    if (exportButton) exportCsv(exportButton.dataset.financeExport);
  });
  document.addEventListener("DOMContentLoaded", addEntrances);
  window.addEventListener("ui:stabilize", addEntrances);
  window.financeReconciliation = { checkoutPage, revenuePage, paymentsPage };
})();
