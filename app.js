const KEY = "detailing-crm-pwa-v3";
const ADMIN_PASSWORD = "admin1234";
const FINANCE_PASSWORD = "boss1688";

const seed = {
  view: "home",
  adminAuthed: false,
  financeAuthed: false,
  packages: [
    { id: 1, active: true, name: "9999 內外超值方案", old: 12800, price: 9999, img: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=900&q=80", text: "內裝深層清潔、外觀洗護、基礎鍍膜維護，適合剛買車或想一次整理的客人。", tags: ["熱門", "高意圖"] },
    { id: 2, active: true, name: "內裝深層拆洗", old: 9800, price: 7800, img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80", text: "座椅、地毯、縫隙深層清潔，處理小孩髒污、煙味、寵物異味與發霉。", tags: ["內裝", "異味處理"] },
    { id: 3, active: true, name: "玻璃油膜鍍膜", old: 4200, price: 3200, img: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80", text: "去除玻璃油膜並建立潑水保護，雨季行車視線更清楚。", tags: ["雨季", "玻璃"] }
  ],
  addons: [
    { id: 1, active: true, name: "寵物毛清潔", price: 1200, text: "加強座椅與地毯寵物毛處理。" },
    { id: 2, active: true, name: "白內裝加強護理", price: 1800, text: "白色內裝專用清潔與保護。" },
    { id: 3, active: true, name: "煙味加強處理", price: 1500, text: "針對煙味來源加強清潔。" }
  ],
  customers: [
    { id: 1, name: "王小姐", phone: "0911222333", car: "Tesla Model Y / 2024", plate: "TES-8899", store: "三重", status: "已預約", deposit: "未收", appointment: "2026-07-08 10:00", tags: ["Tesla", "白內裝"], note: "前台預約測試資料" }
  ],
  reservations: [],
  expenses: [
    { id: 1, date: "2026-07-06", store: "三重", name: "藥水耗材", category: "藥水耗材", amount: 1800 }
  ]
};

const stores = ["三重", "桃園", "新竹", "台南"];
const statuses = ["新進線", "待回覆", "已回覆", "已報價", "考慮中", "已預約", "已收訂", "已到店", "施工中", "已完工", "已回訪", "已流失"];
let db = load();

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || structuredClone(seed); }
  catch { return structuredClone(seed); }
}
function save() { localStorage.setItem(KEY, JSON.stringify(db)); }
function go(view) { db.view = view; save(); render(); }
function money(n) { return "$" + Number(n || 0).toLocaleString("zh-TW"); }
function root() { return document.getElementById("app"); }
function activePackages() { return db.packages.filter((item) => item.active); }
function activeAddons() { return db.addons.filter((item) => item.active); }

function nav(view, icon, text) {
  return `<button class="${db.view === view ? "active" : ""}" onclick="go('${view}')"><strong>${icon}</strong>${text}</button>`;
}

function shell(content, mode = "front") {
  const isAdmin = mode === "admin";
  root().innerHTML = `
    <header class="topbar">
      <h1>${isAdmin ? "管理後台" : "汽車美容預約網站"}</h1>
      <small>${isAdmin ? "CRM、預約、行事曆、套餐管理與財務專區" : "套餐展示、加購選擇、手機預約填單"}</small>
    </header>
    ${isAdmin && db.adminAuthed ? adminMenu() : ""}
    <main class="page">${content}</main>
    <nav class="bottom-nav">
      ${nav("home", "車", "前台")}
      ${nav("reserve", "+", "預約")}
      ${nav("admin", "鎖", "後台")}
      ${nav("adminCalendar", "日", "行事曆")}
      ${nav("adminFinance", "$", "財務")}
    </nav>`;
}

function adminMenu() {
  return `<div class="admin-menu">
    <button onclick="go('adminDashboard')">CRM看板</button>
    <button onclick="go('adminCustomers')">客戶</button>
    <button onclick="go('adminReservations')">預約列表</button>
    <button onclick="go('adminCalendar')">行事曆</button>
    <button onclick="go('adminPackages')">套餐管理</button>
    <button onclick="go('adminAddons')">加購管理</button>
    <button onclick="go('adminFinance')">財務</button>
    <button class="secondary" onclick="logout()">登出</button>
  </div>`;
}

function ensureAdmin(view = "admin") {
  if (!db.adminAuthed) {
    db.view = view;
    adminLogin();
    return false;
  }
  return true;
}

function home() {
  shell(`
    <div class="alert">這是公開網址版 PWA。前台不用密碼；後台請按底部「後台」登入。</div>
    <h2>施工套餐</h2>
    <div class="grid cards">
      ${activePackages().map((pkg) => `<article class="card">
        <img src="${pkg.img}" alt="${pkg.name}">
        <h3>${pkg.name}</h3>
        <p>${pkg.text}</p>
        <div>${pkg.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
        <p><span class="old">${money(pkg.old)}</span><span class="price">${money(pkg.price)}</span></p>
        <button class="gold" onclick="go('reserve')">加入預約</button>
      </article>`).join("")}
    </div>
    <h2>加購專區</h2>
    <div class="grid cards">${activeAddons().map((addon) => addonCard(addon)).join("")}</div>`);
}

function addonCard(addon) {
  return `<article class="card"><h3>${addon.name}</h3><p>${addon.text}</p><p class="price">${money(addon.price)}</p></article>`;
}

function reserve() {
  shell(`<h2>預約填單</h2>
    <form class="grid two" onsubmit="submitReservation(event)">
      <section class="card">
        ${field("稱呼", "name", true)}
        ${field("聯絡電話", "phone", true)}
        ${field("車型 / 年份", "car", true)}
        ${field("車牌", "plate", true)}
        <div class="field"><label>預約門市</label><select id="store">${stores.map((s) => `<option>${s}</option>`).join("")}</select></div>
        ${field("預約日期 / 時間", "datetime", true, "2026-07-09 10:00")}
      </section>
      <section class="card">
        <div class="field"><label>預約方案</label>${activePackages().map((pkg) => `<label class="choice"><input type="checkbox" name="pkg" value="${pkg.id}" onchange="calcTotal()"> ${pkg.name} ${money(pkg.price)}</label>`).join("")}</div>
        <div class="field"><label>加購項目</label>${activeAddons().map((addon) => `<label class="choice"><input type="checkbox" name="addon" value="${addon.id}" onchange="calcTotal()"> ${addon.name} ${money(addon.price)}</label>`).join("")}</div>
        <div class="field"><label>如何得知我們</label><select id="source"><option>FB</option><option>IG</option><option>Google</option><option>朋友介紹</option></select></div>
        <div class="field"><label>其它備註</label><textarea id="note"></textarea></div>
        <h3>總金額 <span id="total" class="price">$0</span></h3>
        <button class="gold" type="submit">送出預約</button>
      </section>
    </form>`);
}

function field(label, id, required = false, placeholder = "") {
  return `<div class="field"><label>${label}</label><input id="${id}" ${required ? "required" : ""} placeholder="${placeholder}"></div>`;
}
function val(id) { return document.getElementById(id).value.trim(); }
function ids(name) { return [...document.querySelectorAll(`input[name=${name}]:checked`)].map((i) => Number(i.value)); }
function total(packageIds, addonIds) {
  return packageIds.reduce((sum, id) => sum + (db.packages.find((p) => p.id === id)?.price || 0), 0)
    + addonIds.reduce((sum, id) => sum + (db.addons.find((a) => a.id === id)?.price || 0), 0);
}
function calcTotal() { document.getElementById("total").textContent = money(total(ids("pkg"), ids("addon"))); }

function submitReservation(event) {
  event.preventDefault();
  const packageIds = ids("pkg");
  const addonIds = ids("addon");
  if (!packageIds.length) return alert("請至少選擇一個預約方案");
  const reservation = {
    id: "R" + Date.now(),
    name: val("name"),
    phone: val("phone"),
    car: val("car"),
    plate: val("plate"),
    store: val("store"),
    datetime: val("datetime"),
    source: val("source"),
    packageIds,
    addonIds,
    note: val("note"),
    imported: false,
    payment: { cash: 0, transfer: 0, deposit: 0, card: total(packageIds, addonIds) }
  };
  db.reservations.unshift(reservation);
  save();
  alert("預約已建立：" + reservation.id);
  go("adminReservations");
}

function adminLogin() {
  shell(`<section class="card login-card">
    <h2>管理後台登入</h2>
    <p class="muted">預設管理密碼：admin1234</p>
    <div class="field"><label>管理密碼</label><input id="adminPwd" type="password" placeholder="請輸入管理密碼"></div>
    <button class="gold" onclick="login()">登入後台</button>
  </section>`, "admin");
}

function login() {
  if (val("adminPwd") !== ADMIN_PASSWORD) return alert("密碼錯誤");
  db.adminAuthed = true;
  db.view = "adminDashboard";
  save();
  render();
}

function logout() {
  db.adminAuthed = false;
  db.financeAuthed = false;
  db.view = "home";
  save();
  render();
}

function dashboard() {
  if (!ensureAdmin("adminDashboard")) return;
  const todayLeads = db.reservations.length;
  const imported = db.reservations.filter((r) => r.imported).length;
  const pending = db.reservations.filter((r) => !r.imported).length;
  shell(`<h2>CRM 營運看板</h2>
    <div class="grid cards">
      ${stat("預約單", db.reservations.length)}
      ${stat("客戶數", db.customers.length)}
      ${stat("已匯入", imported)}
      ${stat("待處理", pending)}
      ${stat("今日進線", todayLeads)}
    </div>
    <section class="card"><h3>逾時/待處理清單</h3>${pending ? db.reservations.filter((r) => !r.imported).map((r) => `<p><span class="tag orange">待匯入</span> ${r.name} ${r.phone} ${r.datetime}</p>`).join("") : "<p class='muted'>目前沒有待處理預約。</p>"}</section>`, "admin");
}

function customers() {
  if (!ensureAdmin("adminCustomers")) return;
  shell(`<div class="row"><h2>客戶管理</h2><button onclick="quickCustomer()">新增客戶</button></div>
    <div class="table-wrap"><table>
      <thead><tr><th>客戶</th><th>車輛</th><th>狀態</th><th>門市 / 預約</th><th>標籤</th><th>操作</th></tr></thead>
      <tbody>${db.customers.map((c) => `<tr>
        <td>${c.name}<br><span class="muted">${c.phone}</span></td>
        <td>${c.car}<br>${c.plate}</td>
        <td>${selectStatus(c)}<br>${c.deposit}</td>
        <td>${c.store}<br>${c.appointment || "-"}</td>
        <td>${(c.tags || []).map((t) => `<span class="tag">${t}</span>`).join("")}</td>
        <td><button onclick="editCustomer(${c.id})">編輯</button></td>
      </tr>`).join("")}</tbody>
    </table></div>`, "admin");
}

function selectStatus(c) {
  return `<select onchange="setCustomerStatus(${c.id}, this.value)">${statuses.map((s) => `<option ${c.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>`;
}
function setCustomerStatus(id, status) { db.customers.find((c) => c.id === id).status = status; save(); }
function quickCustomer() {
  const name = prompt("客戶稱呼");
  if (!name) return;
  db.customers.unshift({ id: Date.now(), name, phone: "", car: "", plate: "", store: "未指定", status: "新進線", deposit: "未收", appointment: "", tags: ["手動新增"], note: "" });
  save();
  customers();
}
function editCustomer(id) {
  const c = db.customers.find((item) => item.id === id);
  const note = prompt("備註", c.note || "");
  if (note !== null) c.note = note;
  save();
  customers();
}

function reservations() {
  if (!ensureAdmin("adminReservations")) return;
  shell(`<h2>預約單管理</h2>
    <div class="grid">${db.reservations.map((r) => `<article class="card">
      <div class="row"><h3>${r.id}</h3><span class="tag">${r.store}</span><span class="tag ${r.imported ? "green" : "orange"}">${r.imported ? "已匯入" : "待匯入"}</span></div>
      <p>${r.name}，${r.phone}<br>${r.car}，${r.plate}<br>${r.datetime}</p>
      <p>${items(r)}</p>
      <button onclick="importReservation('${r.id}')">匯入客戶系統</button>
    </article>`).join("") || "<div class='empty'>目前沒有預約單</div>"}</div>`, "admin");
}

function calendar() {
  if (!ensureAdmin("adminCalendar")) return;
  shell(`<h2>行事曆排程</h2>
    <div class="grid">${db.reservations.map((r) => `<article class="card">
      <div class="row"><h3>${r.datetime}</h3><span class="tag">${r.store}</span></div>
      <p>${r.name}，${r.plate}<br>${items(r)}</p>
      <button onclick="changeReservationTime('${r.id}')">修改時間</button>
    </article>`).join("") || "<div class='empty'>目前沒有行事曆排程</div>"}</div>`, "admin");
}

function changeReservationTime(id) {
  const r = db.reservations.find((item) => item.id === id);
  const next = prompt("新的預約日期 / 時間", r.datetime);
  if (!next) return;
  r.datetime = next;
  const c = db.customers.find((item) => item.phone === r.phone);
  if (c) c.appointment = next;
  save();
  calendar();
}

function items(r) {
  const names = [
    ...r.packageIds.map((id) => db.packages.find((p) => p.id === id)?.name),
    ...r.addonIds.map((id) => db.addons.find((a) => a.id === id)?.name)
  ].filter(Boolean);
  return names.join("、") + "，" + money(total(r.packageIds, r.addonIds));
}

function importReservation(id) {
  const r = db.reservations.find((item) => item.id === id);
  let c = db.customers.find((item) => item.phone === r.phone);
  if (!c) { c = { id: Date.now(), tags: [] }; db.customers.unshift(c); }
  Object.assign(c, {
    name: r.name,
    phone: r.phone,
    car: r.car,
    plate: r.plate,
    store: r.store,
    status: "已預約",
    deposit: "未收",
    appointment: r.datetime,
    note: `前台預約匯入：${items(r)}。備註：${r.note || "-"}`,
    tags: [...new Set([...(c.tags || []), ...autoTags(r)])]
  });
  r.imported = true;
  save();
  alert("已匯入 CRM");
  reservations();
}

function autoTags(r) {
  const text = `${r.car} ${r.note} ${items(r)}`.toLowerCase();
  const tags = ["前台預約"];
  if (text.includes("tesla")) tags.push("Tesla");
  if (text.includes("白")) tags.push("白內裝");
  if (text.includes("煙")) tags.push("煙味");
  if (text.includes("寵物")) tags.push("寵物車");
  if (text.includes("中古")) tags.push("中古車");
  return tags;
}

function packagesPage() {
  if (!ensureAdmin("adminPackages")) return;
  shell(`<div class="row"><h2>套餐編輯管理</h2><button onclick="addPackage()">新增套餐</button></div>
    <div class="grid">${db.packages.map((p) => `<article class="card">
      <img src="${p.img}" alt="${p.name}">
      <h3>${p.name}</h3><p>${p.text}</p><p>${money(p.price)} / 原價 ${money(p.old)}</p>
      <p><span class="tag ${p.active ? "green" : "red"}">${p.active ? "上架" : "下架"}</span></p>
      <button onclick="editPackage(${p.id})">編輯</button>
      <button class="secondary" onclick="togglePackage(${p.id})">${p.active ? "下架" : "上架"}</button>
    </article>`).join("")}</div>`, "admin");
}
function addPackage() {
  db.packages.unshift({ id: Date.now(), active: true, name: "新套餐", old: 0, price: 0, img: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=900&q=80", text: "請編輯服務介紹。", tags: ["新套餐"] });
  save();
  packagesPage();
}
function editPackage(id) {
  const p = db.packages.find((item) => item.id === id);
  p.name = prompt("套餐名稱", p.name) || p.name;
  p.price = Number(prompt("優惠價", p.price) || p.price);
  p.old = Number(prompt("原價", p.old) || p.old);
  p.text = prompt("服務介紹", p.text) || p.text;
  p.img = prompt("圖片網址", p.img) || p.img;
  save();
  packagesPage();
}
function togglePackage(id) { const p = db.packages.find((item) => item.id === id); p.active = !p.active; save(); packagesPage(); }

function addonsPage() {
  if (!ensureAdmin("adminAddons")) return;
  shell(`<div class="row"><h2>加購品編輯管理</h2><button onclick="addAddon()">新增加購</button></div>
    <div class="grid">${db.addons.map((a) => `<article class="card">
      <h3>${a.name}</h3><p>${a.text}</p><p class="price">${money(a.price)}</p>
      <p><span class="tag ${a.active ? "green" : "red"}">${a.active ? "上架" : "下架"}</span></p>
      <button onclick="editAddon(${a.id})">編輯</button>
      <button class="secondary" onclick="toggleAddon(${a.id})">${a.active ? "下架" : "上架"}</button>
    </article>`).join("")}</div>`, "admin");
}
function addAddon() { db.addons.unshift({ id: Date.now(), active: true, name: "新加購", price: 0, text: "請編輯說明。" }); save(); addonsPage(); }
function editAddon(id) {
  const a = db.addons.find((item) => item.id === id);
  a.name = prompt("加購名稱", a.name) || a.name;
  a.price = Number(prompt("單價", a.price) || a.price);
  a.text = prompt("說明", a.text) || a.text;
  save();
  addonsPage();
}
function toggleAddon(id) { const a = db.addons.find((item) => item.id === id); a.active = !a.active; save(); addonsPage(); }

function finance() {
  if (!ensureAdmin("adminFinance")) return;
  if (!db.financeAuthed) {
    shell(`<section class="card login-card">
      <h2>財務專區驗證</h2>
      <p class="muted">預設財務密碼：boss1688</p>
      <div class="field"><label>財務密碼</label><input id="financePwd" type="password" placeholder="請輸入財務密碼"></div>
      <button class="gold" onclick="financeLogin()">進入財務</button>
    </section>`, "admin");
    return;
  }
  const revenue = db.reservations.reduce((sum, r) => sum + total(r.packageIds, r.addonIds), 0);
  const cash = db.reservations.reduce((sum, r) => sum + (r.payment.cash || 0), 0);
  const transfer = db.reservations.reduce((sum, r) => sum + (r.payment.transfer || 0), 0);
  const deposit = db.reservations.reduce((sum, r) => sum + (r.payment.deposit || 0), 0);
  const card = db.reservations.reduce((sum, r) => sum + (r.payment.card || 0), 0);
  const expense = db.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  shell(`<h2>財務專區</h2>
    <div class="grid cards">${stat("總營收", revenue)}${stat("現金", cash)}${stat("匯款", transfer)}${stat("訂金", deposit)}${stat("刷卡", card)}${stat("總支出", expense)}${stat("淨利潤", revenue - expense)}</div>
    <section class="card"><h3>新增支出</h3>${field("支出項目", "expenseName")}${field("支出金額", "expenseAmount")}<button onclick="addExpense()">新增支出</button></section>`, "admin");
}
function financeLogin() {
  if (val("financePwd") !== FINANCE_PASSWORD) return alert("財務密碼錯誤");
  db.financeAuthed = true;
  save();
  finance();
}
function stat(label, value) { return `<div class="card">${label}<div class="stat">${money(value)}</div></div>`; }
function addExpense() {
  const name = val("expenseName");
  const amount = Number(val("expenseAmount"));
  if (!name || !amount) return alert("請填寫支出項目與金額");
  db.expenses.unshift({ id: Date.now(), date: new Date().toISOString().slice(0, 10), store: "未指定", name, category: "雜項開支", amount });
  save();
  finance();
}

function render() {
  const routes = {
    home,
    reserve,
    admin: adminLogin,
    adminDashboard: dashboard,
    adminCustomers: customers,
    adminReservations: reservations,
    adminCalendar: calendar,
    adminPackages: packagesPage,
    adminAddons: addonsPage,
    adminFinance: finance
  };
  (routes[db.view] || home)();
}

render();
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js"));
}
const KEY = "detailing-crm-pwa-v2";

const seed = {
  view: "home",
  packages: [
    { id: 1, name: "9999 內外超值方案", old: 12800, price: 9999, img: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=900&q=80", text: "內裝深層清潔、外觀洗護、基礎鍍膜維護，適合剛買車或想一次整理的客人。", tags: ["熱門", "高意圖"] },
    { id: 2, name: "內裝深層拆洗", old: 9800, price: 7800, img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80", text: "座椅、地毯、縫隙深層清潔，處理小孩髒污、煙味、寵物異味與發霉。", tags: ["內裝", "異味處理"] },
    { id: 3, name: "玻璃油膜鍍膜", old: 4200, price: 3200, img: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80", text: "去除玻璃油膜並建立潑水保護，雨季行車視線更清楚。", tags: ["雨季", "玻璃"] }
  ],
  addons: [
    { id: 1, name: "寵物毛清潔", price: 1200, text: "加強座椅與地毯寵物毛處理。" },
    { id: 2, name: "白內裝加強護理", price: 1800, text: "白色內裝專用清潔與保護。" },
    { id: 3, name: "煙味加強處理", price: 1500, text: "針對煙味來源加強清潔。" }
  ],
  customers: [
    { id: 1, name: "王小姐", phone: "0911222333", car: "Tesla Model Y", plate: "TES-8899", store: "三重", status: "已預約", deposit: "未收", appointment: "2026-07-08 10:00", tags: ["Tesla", "白內裝"] }
  ],
  reservations: [],
  expenses: [
    { id: 1, date: "2026-07-06", store: "三重", name: "藥水耗材", category: "藥水耗材", amount: 1800 }
  ]
};

const stores = ["三重", "桃園", "新竹", "台南"];
let db = load();

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || structuredClone(seed);
  } catch {
    return structuredClone(seed);
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(db));
}

function go(view) {
  db.view = view;
  save();
  render();
}

function money(value) {
  return "$" + Number(value || 0).toLocaleString("zh-TW");
}

function root() {
  return document.getElementById("app");
}

function nav(view, icon, text) {
  return `<button class="${db.view === view ? "active" : ""}" onclick="go('${view}')"><strong>${icon}</strong>${text}</button>`;
}

function shell(content) {
  root().innerHTML = `
    <header class="topbar">
      <h1>汽車美容 CRM PWA</h1>
      <small>前台預約、後台客戶、行事曆與財務看板，支援手機加入主畫面。</small>
    </header>
    <main class="page">${content}</main>
    <nav class="bottom-nav">
      ${nav("home", "車", "套餐")}
      ${nav("reserve", "+", "預約")}
      ${nav("crm", "人", "客戶")}
      ${nav("calendar", "日", "行事曆")}
      ${nav("finance", "$", "財務")}
    </nav>`;
}

function home() {
  shell(`
    <div class="alert">這是 GitHub Pages 版 PWA，資料會先存在目前裝置瀏覽器內，可離線基礎使用。</div>
    <h2>施工套餐</h2>
    <div class="grid cards">
      ${db.packages.map((pkg) => `
        <article class="card">
          <img src="${pkg.img}" alt="${pkg.name}">
          <h3>${pkg.name}</h3>
          <p>${pkg.text}</p>
          <div>${pkg.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
          <p><span class="old">${money(pkg.old)}</span><span class="price">${money(pkg.price)}</span></p>
          <button class="gold" onclick="go('reserve')">加入預約</button>
        </article>`).join("")}
    </div>
    <h2>加購專區</h2>
    <div class="grid cards">
      ${db.addons.map((addon) => `
        <article class="card">
          <h3>${addon.name}</h3>
          <p>${addon.text}</p>
          <p class="price">${money(addon.price)}</p>
        </article>`).join("")}
    </div>`);
}

function reserve() {
  shell(`
    <h2>預約填單</h2>
    <form class="grid two" onsubmit="submitReservation(event)">
      <section class="card">
        ${field("稱呼", "name", true)}
        ${field("聯絡電話", "phone", true)}
        ${field("車型 / 年份", "car", true)}
        ${field("車牌", "plate", true)}
        <div class="field">
          <label>預約門市</label>
          <select id="store">${stores.map((store) => `<option>${store}</option>`).join("")}</select>
        </div>
        ${field("預約日期 / 時間", "datetime", true, "2026-07-09 10:00")}
      </section>
      <section class="card">
        <div class="field">
          <label>預約方案</label>
          ${db.packages.map((pkg) => `<label class="choice"><input type="checkbox" name="pkg" value="${pkg.id}" onchange="calcTotal()"> ${pkg.name} ${money(pkg.price)}</label>`).join("")}
        </div>
        <div class="field">
          <label>加購項目</label>
          ${db.addons.map((addon) => `<label class="choice"><input type="checkbox" name="addon" value="${addon.id}" onchange="calcTotal()"> ${addon.name} ${money(addon.price)}</label>`).join("")}
        </div>
        <div class="field">
          <label>其它備註</label>
          <textarea id="note"></textarea>
        </div>
        <h3>總金額 <span id="total" class="price">$0</span></h3>
        <button class="gold" type="submit">送出預約</button>
      </section>
    </form>`);
}

function field(label, id, required = false, placeholder = "") {
  return `<div class="field"><label>${label}</label><input id="${id}" ${required ? "required" : ""} placeholder="${placeholder}"></div>`;
}

function val(id) {
  return document.getElementById(id).value.trim();
}

function ids(name) {
  return [...document.querySelectorAll(`input[name=${name}]:checked`)].map((input) => Number(input.value));
}

function total(packageIds, addonIds) {
  return packageIds.reduce((sum, id) => sum + (db.packages.find((pkg) => pkg.id === id)?.price || 0), 0)
    + addonIds.reduce((sum, id) => sum + (db.addons.find((addon) => addon.id === id)?.price || 0), 0);
}

function calcTotal() {
  document.getElementById("total").textContent = money(total(ids("pkg"), ids("addon")));
}

function submitReservation(event) {
  event.preventDefault();
  const packageIds = ids("pkg");
  const addonIds = ids("addon");
  if (!packageIds.length) {
    alert("請至少選擇一個預約方案");
    return;
  }
  const reservation = {
    id: "R" + Date.now(),
    name: val("name"),
    phone: val("phone"),
    car: val("car"),
    plate: val("plate"),
    store: val("store"),
    datetime: val("datetime"),
    packageIds,
    addonIds,
    note: val("note"),
    imported: false,
    payment: { cash: 0, transfer: 0, deposit: 0, card: total(packageIds, addonIds) }
  };
  db.reservations.unshift(reservation);
  save();
  alert("預約已建立：" + reservation.id);
  go("calendar");
}

function crm() {
  shell(`
    <div class="row">
      <h2>客戶列表</h2>
      <button onclick="quickCustomer()">新增客戶</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>客戶</th><th>車輛</th><th>狀態</th><th>門市 / 預約</th><th>標籤</th></tr></thead>
        <tbody>
          ${db.customers.map((customer) => `
            <tr>
              <td>${customer.name}<br><span class="muted">${customer.phone}</span></td>
              <td>${customer.car}<br>${customer.plate}</td>
              <td><span class="tag green">${customer.status}</span><br>${customer.deposit}</td>
              <td>${customer.store}<br>${customer.appointment || "-"}</td>
              <td>${(customer.tags || []).map((tag) => `<span class="tag">${tag}</span>`).join("")}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`);
}

function quickCustomer() {
  const name = prompt("客戶稱呼");
  if (!name) return;
  db.customers.unshift({ id: Date.now(), name, phone: "", car: "", plate: "", store: "未指定", status: "新進線", deposit: "未收", appointment: "", tags: ["手動新增"] });
  save();
  crm();
}

function calendar() {
  shell(`
    <h2>行事曆 / 預約單</h2>
    <div class="grid">
      ${db.reservations.map((reservation) => `
        <article class="card">
          <div class="row">
            <h3>${reservation.datetime}</h3>
            <span class="tag">${reservation.store}</span>
            <span class="tag ${reservation.imported ? "green" : "orange"}">${reservation.imported ? "已匯入" : "待匯入"}</span>
          </div>
          <p>${reservation.name}，${reservation.phone}<br>${reservation.car}，${reservation.plate}</p>
          <p>${items(reservation)}</p>
          <button onclick="importReservation('${reservation.id}')">匯入客戶系統</button>
        </article>`).join("") || '<div class="empty">目前沒有預約</div>'}
    </div>`);
}

function items(reservation) {
  const names = [
    ...reservation.packageIds.map((id) => db.packages.find((pkg) => pkg.id === id)?.name),
    ...reservation.addonIds.map((id) => db.addons.find((addon) => addon.id === id)?.name)
  ].filter(Boolean);
  return names.join("、") + "，" + money(total(reservation.packageIds, reservation.addonIds));
}

function importReservation(id) {
  const reservation = db.reservations.find((item) => item.id === id);
  let customer = db.customers.find((item) => item.phone === reservation.phone);
  if (!customer) {
    customer = { id: Date.now(), tags: [] };
    db.customers.unshift(customer);
  }
  Object.assign(customer, {
    name: reservation.name,
    phone: reservation.phone,
    car: reservation.car,
    plate: reservation.plate,
    store: reservation.store,
    status: "已預約",
    deposit: "未收",
    appointment: reservation.datetime,
    tags: [...new Set([...(customer.tags || []), ...autoTags(reservation)])]
  });
  reservation.imported = true;
  save();
  alert("已匯入 CRM");
  calendar();
}

function autoTags(reservation) {
  const text = `${reservation.car} ${reservation.note} ${items(reservation)}`.toLowerCase();
  const tags = [];
  if (text.includes("tesla")) tags.push("Tesla");
  if (text.includes("白")) tags.push("白內裝");
  if (text.includes("煙")) tags.push("煙味");
  if (text.includes("寵物")) tags.push("寵物車");
  if (text.includes("中古")) tags.push("中古車");
  return tags.length ? tags : ["前台預約"];
}

function finance() {
  const revenue = db.reservations.reduce((sum, reservation) => sum + total(reservation.packageIds, reservation.addonIds), 0);
  const cash = db.reservations.reduce((sum, reservation) => sum + (reservation.payment.cash || 0), 0);
  const transfer = db.reservations.reduce((sum, reservation) => sum + (reservation.payment.transfer || 0), 0);
  const deposit = db.reservations.reduce((sum, reservation) => sum + (reservation.payment.deposit || 0), 0);
  const card = db.reservations.reduce((sum, reservation) => sum + (reservation.payment.card || 0), 0);
  const expense = db.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  shell(`
    <h2>財務看板</h2>
    <div class="grid cards">
      ${stat("總營收", revenue)}
      ${stat("現金", cash)}
      ${stat("匯款", transfer)}
      ${stat("訂金", deposit)}
      ${stat("刷卡", card)}
      ${stat("總支出", expense)}
      ${stat("淨利潤", revenue - expense)}
    </div>
    <section class="card">
      <h3>新增支出</h3>
      ${field("支出項目", "expenseName")}
      ${field("支出金額", "expenseAmount")}
      <button onclick="addExpense()">新增支出</button>
    </section>`);
}

function stat(label, value) {
  return `<div class="card">${label}<div class="stat">${money(value)}</div></div>`;
}

function addExpense() {
  const name = val("expenseName");
  const amount = Number(val("expenseAmount"));
  if (!name || !amount) {
    alert("請填寫支出項目與金額");
    return;
  }
  db.expenses.unshift({ id: Date.now(), date: new Date().toISOString().slice(0, 10), store: "未指定", name, category: "雜項開支", amount });
  save();
  finance();
}

function render() {
  ({ home, reserve, crm, calendar, finance }[db.view] || home)();
}

render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js"));
}
