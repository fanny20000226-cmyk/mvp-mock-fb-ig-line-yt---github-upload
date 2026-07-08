(() => {
  const KEY = "beauty-crm-v10";

  function data() {
    const db = window.db || {};
    db.menu = db.menu || [
      {
        id: "M001",
        image: "",
        name: "9999內外超值",
        amount: 9999,
        desc: "內外清潔、基礎美容與細節整理。",
        category: "基礎服務套餐",
        online: true,
        sort: 10,
        deleted: false,
        createdAt: new Date().toISOString()
      },
      {
        id: "M002",
        image: "",
        name: "內裝深層拆洗",
        amount: 7800,
        desc: "座椅、地毯、門板深層清潔，適合髒污與異味車。",
        category: "基礎服務套餐",
        online: true,
        sort: 20,
        deleted: false,
        createdAt: new Date().toISOString()
      }
    ];
    db.reservation = db.reservation || db.orders || [];
    db.reschedule_log = db.reschedule_log || [];
    db.cancel_reservation = db.cancel_reservation || [];
    db.customerNotifications = db.customerNotifications || [];
    db.logs = db.logs || [];
    return db;
  }

  function persist() {
    const db = data();
    localStorage.setItem(KEY, JSON.stringify(db));
  }

  function log(text) {
    const db = data();
    db.logs.unshift(`${new Date().toLocaleString("zh-TW")} ${text}`);
    persist();
  }

  function money(value) {
    return `$${Number(value || 0).toLocaleString("zh-TW", { maximumFractionDigits: 2 })}`;
  }

  function esc(value) {
    return String(value || "").replace(/[&<>"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[char]));
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function val(id) {
    return (byId(id)?.value || "").trim();
  }

  function button(label, attrs = "", cls = "") {
    return `<button class="${cls}" ${attrs}>${label}</button>`;
  }

  function field(label, id, value = "", type = "text") {
    return `<div class="field"><label>${label}</label><input id="${id}" type="${type}" value="${esc(value)}"></div>`;
  }

  function area(label, id, value = "") {
    return `<div class="field"><label>${label}</label><textarea id="${id}">${esc(value)}</textarea></div>`;
  }

  function select(label, id, items, selected = "") {
    return `<div class="field"><label>${label}</label><select id="${id}">${items.map((item) => (
      `<option value="${esc(item)}" ${String(item) === String(selected) ? "selected" : ""}>${esc(item)}</option>`
    )).join("")}</select></div>`;
  }

  function shell(title, body, admin = false) {
    const adminMenu = admin && data().authed ? `<div class="admin-menu">
      ${button("總覽", 'data-go="adminHome"')}
      ${button("菜單管理", 'data-ext-go="menuAdmin"')}
      ${button("取消預約列表", 'data-ext-go="cancelAdmin"')}
      ${button("訂單", 'data-go="orders"')}
      ${button("行事曆", 'data-go="calendar"')}
      ${button("報表", 'data-go="reports"')}
    </div>` : "";

    byId("app").innerHTML = `<header class="topbar worktop">
      <div><h1>${title}</h1><small>${admin ? "管理後台" : "前台工作台"} · ${navigator.onLine ? "線上" : "離線可用"}</small></div>
      ${button(admin ? "回前台" : "後台", `data-go="${admin ? "home" : "adminLogin"}"`, "ghost")}
    </header>${adminMenu}<main class="page">${body}</main><nav class="bottom-nav">
      ${button("<strong>工</strong>工作台", 'data-go="home"')}
      ${button("<strong>菜</strong>菜單", 'data-ext-go="publicMenu"')}
      ${button("<strong>我</strong>我的預約", 'data-ext-go="memberReservations"')}
      ${button("<strong>訂</strong>訂單", 'data-go="orders"')}
      ${button("<strong>客</strong>客戶", 'data-go="customers"')}
    </nav>`;
  }

  function categories() {
    const defaults = ["基礎服務套餐", "單項服務", "額外加購項目"];
    const fromMenu = data().menu.map((item) => item.category).filter(Boolean);
    return [...new Set(defaults.concat(fromMenu))];
  }

  function menuCard(item, editable = false) {
    const image = item.image
      ? `<img src="${item.image}" alt="${esc(item.name)}">`
      : `<div class="menu-image-empty">圖片</div>`;
    return `<article class="card menu-card ${item.online ? "" : "is-offline"}">
      <label class="menu-select-row">${editable ? `<input type="checkbox" data-menu-check="${item.id}">` : `<input type="checkbox" data-menu-pick="${item.id}">`} <span>${item.online ? "上架" : "下架"}</span></label>
      <div class="menu-image">${image}</div>
      <h3>${esc(item.name)}</h3>
      <p class="price">${money(item.amount)}</p>
      <p>${esc(item.desc || "無說明")}</p>
      <span class="tag">${esc(item.category || "未分類")}</span>
      <small class="muted">排序 ${Number(item.sort || 0)}</small>
      ${editable ? `<div class="row">${button("編輯", `data-menu-edit="${item.id}"`)}${button("軟刪除", `data-menu-delete="${item.id}"`, "secondary")}</div>` : ""}
    </article>`;
  }

  function publicMenu() {
    const items = data().menu
      .filter((item) => item.online && !item.deleted)
      .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
    shell("圖片價目菜單", `<section class="banner">前台只顯示已上架服務，顧客可勾選服務，不能修改價格與內容。</section>
      <section class="grid cards menu-grid">${items.map((item) => menuCard(item)).join("") || '<div class="empty">目前尚無上架菜單</div>'}</section>
      <section class="card"><h2>已選服務</h2><div id="pickedMenuList" class="muted">尚未選取</div></section>`);
    refreshPickedMenu();
  }

  function refreshPickedMenu() {
    const picked = [...document.querySelectorAll("[data-menu-pick]:checked")].map((input) => input.dataset.menuPick);
    const items = data().menu.filter((item) => picked.includes(item.id));
    const target = byId("pickedMenuList");
    if (!target) return;
    target.innerHTML = items.length
      ? `${items.map((item) => `<span class="tag green">${esc(item.name)} ${money(item.amount)}</span>`).join("")}<p class="price">${money(items.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</p>`
      : "尚未選取";
  }

  function menuAdmin(editId = "") {
    const db = data();
    if (!db.authed) return window.go("adminLogin");
    const item = db.menu.find((entry) => entry.id === editId) || {};
    const list = db.menu
      .filter((entry) => !entry.deleted)
      .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0));
    shell("菜單管理", `<section class="card">
        <h2>${item.id ? "編輯菜單項目" : "新增菜單項目"}</h2>
        <input id="menuId" type="hidden" value="${esc(item.id || "")}">
        <div class="menu-editor">
          <div>
            <label class="upload-box">
              <input id="menuImage" type="file" accept="image/*">
              <span>上傳 / 替換圖片</span>
            </label>
            <div id="menuPreview" class="menu-preview">${item.image ? `<img src="${item.image}" alt="">` : "尚未選圖片"}</div>
            ${button("刪除圖片", 'data-menu-image-clear="1"', "secondary")}
          </div>
          <div>
            ${field("項目名稱", "menuName", item.name || "")}
            ${field("自訂金額", "menuAmount", item.amount || "", "number")}
            ${area("備註說明", "menuDesc", item.desc || "")}
            ${select("分類選擇", "menuCategory", categories(), item.category || categories()[0])}
            ${field("新增分類", "menuNewCategory", "")}
            ${field("排序權重", "menuSort", item.sort || 10, "number")}
            <label class="choice"><input id="menuOnline" type="checkbox" ${item.online !== false ? "checked" : ""}> 上架顯示於前台</label>
            <input id="menuImageData" type="hidden" value="${esc(item.image || "")}">
            <div class="row">${button(item.id ? "儲存修改" : "新增菜單", 'data-act-ext="saveMenu"', "gold")}${button("清空表單", 'data-ext-go="menuAdmin"', "secondary")}</div>
          </div>
        </div>
      </section>
      <section class="card row">
        ${button("批量上架", 'data-act-ext="bulkMenuOn"')}
        ${button("批量下架", 'data-act-ext="bulkMenuOff"', "secondary")}
      </section>
      <section class="grid cards menu-grid">${list.map((entry) => menuCard(entry, true)).join("") || '<div class="empty">尚未建立菜單</div>'}</section>`, true);
  }

  function saveMenu() {
    const db = data();
    const id = val("menuId") || `M${Date.now()}`;
    const category = val("menuNewCategory") || val("menuCategory");
    const payload = {
      id,
      image: val("menuImageData"),
      name: val("menuName"),
      amount: Number(val("menuAmount") || 0),
      desc: val("menuDesc"),
      category,
      online: !!byId("menuOnline")?.checked,
      sort: Number(val("menuSort") || 0),
      deleted: false,
      updatedAt: new Date().toISOString()
    };
    const index = db.menu.findIndex((item) => item.id === id);
    if (index >= 0) db.menu[index] = { ...db.menu[index], ...payload };
    else db.menu.push({ ...payload, createdAt: new Date().toISOString() });
    log(`${index >= 0 ? "更新" : "新增"}菜單 ${payload.name}`);
    persist();
    menuAdmin();
  }

  function selectedAdminMenus() {
    return [...document.querySelectorAll("[data-menu-check]:checked")].map((input) => input.dataset.menuCheck);
  }

  function bulkMenu(online) {
    const ids = selectedAdminMenus();
    data().menu.forEach((item) => {
      if (ids.includes(item.id)) item.online = online;
    });
    log(`批量${online ? "上架" : "下架"} ${ids.length} 個菜單項目`);
    persist();
    menuAdmin();
  }

  function softDeleteMenu(id) {
    const item = data().menu.find((entry) => entry.id === id);
    if (!item) return;
    item.deleted = true;
    item.online = false;
    item.deletedAt = new Date().toISOString();
    log(`軟刪除菜單 ${item.name}`);
    persist();
    menuAdmin();
  }

  function memberReservations() {
    const orders = data().orders || [];
    shell("我的預約", `<section class="banner">可送出改期或取消申請，送出後會進入後台待審核。</section>
      <section class="grid cards">${orders.map((order) => `<article class="card">
        <h3>${esc(order.name)} ${esc(order.plate)}</h3>
        <p>${esc(order.date)} ${esc(order.time)}　${esc(order.store)}</p>
        <p>${esc(order.car)} / ${esc(order.status)}</p>
        <div class="row">${button("申請改期", `data-reschedule="${order.id}"`)}${button("申請取消", `data-cancel="${order.id}"`, "secondary")}</div>
      </article>`).join("") || '<div class="empty">目前沒有預約</div>'}</section>`);
  }

  function requestBox(orderId, type) {
    const order = data().orders.find((entry) => entry.id === orderId);
    if (!order) return;
    const body = type === "reschedule"
      ? `${field("新日期", "requestDate", order.date, "date")}${field("新時間", "requestTime", order.time, "time")}${area("改期備註", "requestNote", "")}${button("送出改期申請", `data-submit-reschedule="${order.id}"`, "gold")}`
      : `${select("取消原因", "cancelReason", ["臨時有事", "時間不方便", "方案需重新確認", "價格考量", "其他"], "臨時有事")}${area("自訂備註", "requestNote", "")}${button("送出取消申請", `data-submit-cancel="${order.id}"`, "gold")}`;
    shell(type === "reschedule" ? "申請改期" : "申請取消", `<section class="card">
      <h2>${esc(order.name)} ${esc(order.plate)}</h2>
      <p>原預約：${esc(order.date)} ${esc(order.time)} ${esc(order.store)}</p>
      ${body}
    </section>`);
  }

  function submitReschedule(orderId) {
    const db = data();
    const order = db.orders.find((entry) => entry.id === orderId);
    if (!order) return;
    db.reschedule_log.unshift({
      id: `R${Date.now()}`,
      orderId,
      name: order.name,
      phone: order.phone,
      plate: order.plate,
      service: order.plan || "",
      oldDate: order.date,
      oldTime: order.time,
      newDate: val("requestDate"),
      newTime: val("requestTime"),
      note: val("requestNote"),
      status: "待審核",
      createdAt: new Date().toISOString()
    });
    db.customerNotifications.unshift(`已送出改期申請：${order.name} ${order.plate}`);
    log(`收到改期申請 ${order.id}`);
    persist();
    alert("已送出改期申請，等待後台審核");
    memberReservations();
  }

  function submitCancel(orderId) {
    const db = data();
    const order = db.orders.find((entry) => entry.id === orderId);
    if (!order) return;
    db.cancel_reservation.unshift({
      id: `CXL${Date.now()}`,
      orderId,
      name: order.name,
      phone: order.phone,
      plate: order.plate,
      service: order.plan || "",
      date: order.date,
      time: order.time,
      store: order.store,
      reason: val("cancelReason"),
      note: val("requestNote"),
      status: "待審核",
      refundStatus: "未退款",
      createdAt: new Date().toISOString()
    });
    db.customerNotifications.unshift(`已送出取消申請：${order.name} ${order.plate}`);
    log(`收到取消申請 ${order.id}`);
    persist();
    alert("已送出取消申請，等待後台審核");
    memberReservations();
  }

  function cancelAdmin() {
    const db = data();
    if (!db.authed) return window.go("adminLogin");
    const keyword = val("cancelKeyword");
    const from = val("cancelFrom");
    const to = val("cancelTo");
    const match = (row) => {
      const date = row.createdAt?.slice(0, 10) || row.date || row.newDate || "";
      const haystack = [row.name, row.phone, row.service, row.plate].join(" ");
      return (!keyword || haystack.includes(keyword)) && (!from || date >= from) && (!to || date <= to);
    };
    const pending = db.cancel_reservation.filter((row) => row.status === "待審核" && match(row));
    const archived = db.cancel_reservation.filter((row) => row.status !== "待審核" && match(row));
    const reschedules = db.reschedule_log.filter(match);
    shell("取消預約列表", `<section class="card row">
        ${field("起日", "cancelFrom", from, "date")}
        ${field("迄日", "cancelTo", to, "date")}
        ${field("姓名/手機/服務", "cancelKeyword", keyword)}
        ${button("篩選", 'data-ext-go="cancelAdmin"')}
        ${button("匯出Excel", 'data-act-ext="exportCancel"', "gold")}
      </section>
      <h2>待審核取消申請</h2>${cancelTable(pending, true)}
      <h2>已取消 / 已駁回訂單</h2>${cancelTable(archived, false)}
      <h2>改期紀錄</h2>${rescheduleTable(reschedules)}`, true);
  }

  function cancelTable(rows, pending) {
    return `<section class="table-wrap"><table><thead><tr><th>顧客</th><th>原預約</th><th>原因</th><th>狀態</th><th>操作</th></tr></thead><tbody>
      ${rows.map((row) => `<tr><td>${esc(row.name)}<br>${esc(row.phone)}<br>${esc(row.plate)}</td><td>${esc(row.date)} ${esc(row.time)}<br>${esc(row.store)}</td><td>${esc(row.reason)}<br>${esc(row.note)}</td><td>${esc(row.status)}<br>退款：${esc(row.refundStatus || "-")}</td><td>${pending ? `${button("同意取消", `data-approve-cancel="${row.id}"`)}${button("駁回", `data-reject-cancel="${row.id}"`, "secondary")}` : "-"}</td></tr>`).join("") || '<tr><td colspan="5">沒有資料</td></tr>'}
    </tbody></table></section>`;
  }

  function rescheduleTable(rows) {
    return `<section class="table-wrap"><table><thead><tr><th>顧客</th><th>原時間</th><th>新時間</th><th>狀態</th><th>操作</th></tr></thead><tbody>
      ${rows.map((row) => `<tr><td>${esc(row.name)}<br>${esc(row.phone)}<br>${esc(row.plate)}</td><td>${esc(row.oldDate)} ${esc(row.oldTime)}</td><td>${esc(row.newDate)} ${esc(row.newTime)}<br>${esc(row.note)}</td><td>${esc(row.status)}</td><td>${row.status === "待審核" ? `${button("同意改期", `data-approve-reschedule="${row.id}"`)}${button("駁回", `data-reject-reschedule="${row.id}"`, "secondary")}` : "-"}</td></tr>`).join("") || '<tr><td colspan="5">沒有資料</td></tr>'}
    </tbody></table></section>`;
  }

  function approveCancel(id) {
    const db = data();
    const row = db.cancel_reservation.find((entry) => entry.id === id);
    if (!row) return;
    row.status = "已取消";
    row.cancelledAt = new Date().toISOString();
    row.refundStatus = "待確認";
    const order = db.orders.find((entry) => entry.id === row.orderId);
    if (order) order.status = "取消";
    db.customerNotifications.unshift(`取消申請已通過：${row.name} ${row.plate}`);
    log(`同意取消 ${row.orderId}`);
    persist();
    cancelAdmin();
  }

  function rejectCancel(id) {
    const row = data().cancel_reservation.find((entry) => entry.id === id);
    if (!row) return;
    row.status = "已駁回";
    row.rejectReason = prompt("請輸入駁回理由") || "未填寫";
    data().customerNotifications.unshift(`取消申請已駁回：${row.rejectReason}`);
    log(`駁回取消 ${row.orderId}`);
    persist();
    cancelAdmin();
  }

  function approveReschedule(id) {
    const db = data();
    const row = db.reschedule_log.find((entry) => entry.id === id);
    if (!row) return;
    const order = db.orders.find((entry) => entry.id === row.orderId);
    if (order) {
      order.date = row.newDate;
      order.time = row.newTime;
    }
    row.status = "已改期";
    row.approvedAt = new Date().toISOString();
    db.customerNotifications.unshift(`改期申請已通過：${row.newDate} ${row.newTime}`);
    log(`同意改期 ${row.orderId}`);
    persist();
    cancelAdmin();
  }

  function rejectReschedule(id) {
    const row = data().reschedule_log.find((entry) => entry.id === id);
    if (!row) return;
    row.status = "已駁回";
    row.rejectReason = prompt("請輸入駁回理由") || "未填寫";
    data().customerNotifications.unshift(`改期申請已駁回：${row.rejectReason}`);
    log(`駁回改期 ${row.orderId}`);
    persist();
    cancelAdmin();
  }

  function exportCancel() {
    const db = data();
    const rows = [
      "類型,狀態,顧客,電話,車牌,服務,原日期,原時間,新日期,新時間,原因/備註",
      ...db.cancel_reservation.map((row) => `取消,${row.status},${row.name},${row.phone},${row.plate},${row.service},${row.date},${row.time},,,${row.reason} ${row.note || ""}`),
      ...db.reschedule_log.map((row) => `改期,${row.status},${row.name},${row.phone},${row.plate},${row.service},${row.oldDate},${row.oldTime},${row.newDate},${row.newTime},${row.note || ""}`)
    ];
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv" }));
    link.download = "cancel-reservation-report.csv";
    link.click();
  }

  function enhanceHome() {
    if (window.screenLayoutManager) return;
    data();
    const grid = document.querySelector(".tool-grid");
    if (grid && !grid.querySelector("[data-ext-go]")) {
      grid.insertAdjacentHTML("beforeend", `
        <button class="tool" data-ext-go="publicMenu"><strong>菜</strong><span>圖片菜單</span></button>
        <button class="tool" data-ext-go="memberReservations"><strong>我</strong><span>我的預約</span></button>
        <button class="tool" data-ext-go="menuAdmin"><strong>編</strong><span>菜單管理</span></button>
        <button class="tool" data-ext-go="cancelAdmin"><strong>取</strong><span>取消列表</span></button>
      `);
    }

    const menu = document.querySelector(".admin-menu");
    if (menu && !menu.querySelector('[data-ext-go="menuAdmin"]')) {
      menu.insertAdjacentHTML("afterbegin", `
        <button data-ext-go="menuAdmin">圖片菜單管理</button>
        <button data-ext-go="cancelAdmin">取消預約列表</button>
      `);
    }

    const title = document.querySelector(".topbar h1")?.textContent || "";
    const isOldPricePage = title.includes("價目") && !document.querySelector(".upload-box");
    if (isOldPricePage && data().authed) {
      menuAdmin();
    }
  }

  const routes = { publicMenu, menuAdmin, memberReservations, cancelAdmin };
  const actions = { saveMenu, bulkMenuOn: () => bulkMenu(true), bulkMenuOff: () => bulkMenu(false), exportCancel };

  document.addEventListener("click", (event) => {
    const route = event.target.closest("[data-ext-go]");
    if (route) {
      event.preventDefault();
      event.stopImmediatePropagation();
      routes[route.dataset.extGo]?.();
      return;
    }

    const oldPriceButton = event.target.closest('[data-go="prices"]');
    if (oldPriceButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      menuAdmin();
      return;
    }

    const action = event.target.closest("[data-act-ext]");
    if (action) {
      event.preventDefault();
      event.stopImmediatePropagation();
      actions[action.dataset.actExt]?.();
      return;
    }

    const edit = event.target.closest("[data-menu-edit]");
    if (edit) return menuAdmin(edit.dataset.menuEdit);

    const del = event.target.closest("[data-menu-delete]");
    if (del && confirm("確認軟刪除此菜單？")) return softDeleteMenu(del.dataset.menuDelete);

    const clear = event.target.closest("[data-menu-image-clear]");
    if (clear) {
      const hidden = byId("menuImageData");
      const preview = byId("menuPreview");
      if (hidden) hidden.value = "";
      if (preview) preview.textContent = "尚未選圖片";
    }

    const reschedule = event.target.closest("[data-reschedule]");
    if (reschedule) return requestBox(reschedule.dataset.reschedule, "reschedule");

    const cancel = event.target.closest("[data-cancel]");
    if (cancel) return requestBox(cancel.dataset.cancel, "cancel");

    const submitRes = event.target.closest("[data-submit-reschedule]");
    if (submitRes) return submitReschedule(submitRes.dataset.submitReschedule);

    const submitCancelBtn = event.target.closest("[data-submit-cancel]");
    if (submitCancelBtn) return submitCancel(submitCancelBtn.dataset.submitCancel);

    const approveCancelBtn = event.target.closest("[data-approve-cancel]");
    if (approveCancelBtn) return approveCancel(approveCancelBtn.dataset.approveCancel);

    const rejectCancelBtn = event.target.closest("[data-reject-cancel]");
    if (rejectCancelBtn) return rejectCancel(rejectCancelBtn.dataset.rejectCancel);

    const approveRescheduleBtn = event.target.closest("[data-approve-reschedule]");
    if (approveRescheduleBtn) return approveReschedule(approveRescheduleBtn.dataset.approveReschedule);

    const rejectRescheduleBtn = event.target.closest("[data-reject-reschedule]");
    if (rejectRescheduleBtn) return rejectReschedule(rejectRescheduleBtn.dataset.rejectReschedule);
  }, true);

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-menu-pick]")) refreshPickedMenu();
    if (event.target.id === "menuImage") {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const hidden = byId("menuImageData");
        const preview = byId("menuPreview");
        if (hidden) hidden.value = reader.result;
        if (preview) preview.innerHTML = `<img src="${reader.result}" alt="">`;
      };
      reader.readAsDataURL(file);
    }
  }, true);

  let enhanceRuns = 0;
  const enhanceTimer = setInterval(() => {
    enhanceHome();
    enhanceRuns += 1;
    if (enhanceRuns > 20) clearInterval(enhanceTimer);
  }, 300);
  document.addEventListener("click", () => setTimeout(enhanceHome, 80), true);
  setTimeout(enhanceHome, 100);
})();
