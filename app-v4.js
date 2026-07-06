const KEY = "car-crm-pwa-admin-v1";
const ADMIN_PASSWORD = "admin1234";
const FINANCE_PASSWORD = "boss1688";

const seed = {
  view: "home",
  admin: false,
  finance: false,
  packages: [
    { id: 1, active: true, name: "9999 內外超值方案", old: 12800, price: 9999, text: "內裝深層清潔、外觀洗護、基礎鍍膜維護。", tags: ["熱門", "高意圖"] },
    { id: 2, active: true, name: "內裝深層拆洗", old: 9800, price: 7800, text: "座椅、地毯、縫隙深層清潔，處理煙味、寵物異味與發霉。", tags: ["內裝", "異味"] },
    { id: 3, active: true, name: "玻璃油膜鍍膜", old: 4200, price: 3200, text: "去除玻璃油膜並建立潑水保護。", tags: ["雨季", "玻璃"] }
  ],
  addons: [
    { id: 1, active: true, name: "寵物毛清潔", price: 1200, text: "加強座椅與地毯寵物毛處理。" },
    { id: 2, active: true, name: "白內裝護理", price: 1800, text: "白色內裝專用清潔與保護。" },
    { id: 3, active: true, name: "煙味加強處理", price: 1500, text: "針對煙味來源加強清潔。" }
  ],
  reservations: [],
  customers: [
    { id: 1, name: "王小姐", phone: "0911222333", car: "Tesla Model Y / 2024", plate: "TES-8899", store: "三重", status: "已預約", deposit: "未收", appointment: "2026-07-08 10:00", tags: ["Tesla", "白內裝"] }
  ],
  expenses: [{ id: 1, name: "藥水耗材", amount: 1800 }]
};

let db = load();
const stores = ["三重", "桃園", "新竹", "台南"];
const $ = (id) => document.getElementById(id);
const nt = (n) => "$" + Number(n || 0).toLocaleString("zh-TW");

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || structuredClone(seed); }
  catch { return structuredClone(seed); }
}
function save() { localStorage.setItem(KEY, JSON.stringify(db)); }
function go(view) { db.view = view; save(); render(); }
function val(id) { return $(id).value.trim(); }
function selected(name) { return [...document.querySelectorAll(`input[name=${name}]:checked`)].map((i) => Number(i.value)); }
function active(list) { return list.filter((x) => x.active); }
function sumOrder(packs, addons) {
  return packs.reduce((s, id) => s + (db.packages.find((x) => x.id === id)?.price || 0), 0)
    + addons.reduce((s, id) => s + (db.addons.find((x) => x.id === id)?.price || 0), 0);
}

function layout(title, body, admin = false) {
  $("app").innerHTML = `
    <header class="topbar"><h1>${title}</h1><small>${admin ? "管理後台：CRM、預約、行事曆、套餐與財務" : "客戶前台：套餐、加購、預約填單"}</small></header>
    ${admin && db.admin ? menu() : ""}
    <main class="page">${body}</main>
    <nav class="bottom-nav">
      ${tab("home", "車", "前台")}
      ${tab("reserve", "+", "預約")}
      ${tab("admin", "鎖", "後台")}
      ${tab("calendar", "日", "行事曆")}
      ${tab("finance", "$", "財務")}
    </nav>`;
}
function tab(view, icon, text) {
  return `<button class="${db.view === view ? "active" : ""}" onclick="go('${view}')"><strong>${icon}</strong>${text}</button>`;
}
function menu() {
  return `<div class="admin-menu">
    <button onclick="go('dashboard')">CRM看板</button>
    <button onclick="go('customers')">客戶</button>
    <button onclick="go('reservations')">預約列表</button>
    <button onclick="go('calendar')">行事曆</button>
    <button onclick="go('packages')">套餐管理</button>
    <button onclick="go('addons')">加購管理</button>
    <button onclick="go('finance')">財務</button>
    <button class="secondary" onclick="db.admin=false;db.finance=false;go('home')">登出</button>
  </div>`;
}
function needAdmin(view) {
  if (db.admin) return true;
  db.view = view;
  adminLogin();
  return false;
}

function home() {
  layout("汽車美容預約網站", `
    <div class="alert">前台公開使用；管理功能請按底部「後台」登入。</div>
    <h2>施工套餐</h2>
    <div class="grid cards">${active(db.packages).map(packageCard).join("")}</div>
    <h2>加購專區</h2>
    <div class="grid cards">${active(db.addons).map(addonCard).join("")}</div>`);
}
function packageCard(p) {
  return `<article class="card"><h3>${p.name}</h3><p>${p.text}</p><p><span class="old">${nt(p.old)}</span><span class="price">${nt(p.price)}</span></p>${p.tags.map((t) => `<span class="tag">${t}</span>`).join("")}<br><button class="gold" onclick="go('reserve')">加入預約</button></article>`;
}
function addonCard(a) {
  return `<article class="card"><h3>${a.name}</h3><p>${a.text}</p><p class="price">${nt(a.price)}</p></article>`;
}

function reserve() {
  layout("預約填單", `
    <form class="grid two" onsubmit="submitReserve(event)">
      <section class="card">${field("稱呼", "name")}${field("聯絡電話", "phone")}${field("車型 / 年份", "car")}${field("車牌", "plate")}
        <div class="field"><label>門市</label><select id="store">${stores.map((s) => `<option>${s}</option>`).join("")}</select></div>
        ${field("預約日期 / 時間", "time", "2026-07-09 10:00")}
      </section>
      <section class="card">
        <div class="field"><label>預約方案</label>${active(db.packages).map((p) => `<label class="choice"><input name="pack" type="checkbox" value="${p.id}" onchange="calc()"> ${p.name} ${nt(p.price)}</label>`).join("")}</div>
        <div class="field"><label>加購</label>${active(db.addons).map((a) => `<label class="choice"><input name="addon" type="checkbox" value="${a.id}" onchange="calc()"> ${a.name} ${nt(a.price)}</label>`).join("")}</div>
        <div class="field"><label>備註</label><textarea id="note"></textarea></div>
        <h3>總金額 <span id="total" class="price">$0</span></h3>
        <button class="gold">送出預約</button>
      </section>
    </form>`);
}
function field(label, id, placeholder = "") {
  return `<div class="field"><label>${label}</label><input required id="${id}" placeholder="${placeholder}"></div>`;
}
function calc() { $("total").textContent = nt(sumOrder(selected("pack"), selected("addon"))); }
function submitReserve(e) {
  e.preventDefault();
  const pack = selected("pack");
  const addon = selected("addon");
  if (!pack.length) return alert("請至少選一個方案");
  db.reservations.unshift({ id: "R" + Date.now(), name: val("name"), phone: val("phone"), car: val("car"), plate: val("plate"), store: val("store"), time: val("time"), note: val("note"), pack, addon, imported: false });
  save();
  alert("預約成功，已進入後台預約列表");
  go("reservations");
}

function adminLogin() {
  layout("管理後台登入", `<section class="card login-card"><h2>後台登入</h2><p class="muted">預設密碼：admin1234</p><div class="field"><label>管理密碼</label><input id="pwd" type="password"></div><button class="gold" onclick="login()">登入</button></section>`, true);
}
function login() {
  if (val("pwd") !== ADMIN_PASSWORD) return alert("密碼錯誤");
  db.admin = true;
  go("dashboard");
}
function dashboard() {
  if (!needAdmin("dashboard")) return;
  const waiting = db.reservations.filter((r) => !r.imported).length;
  layout("管理後台", `<h2>CRM 看板</h2><div class="grid cards">${stat("客戶數", db.customers.length)}${stat("預約單", db.reservations.length)}${stat("待匯入", waiting)}${stat("已匯入", db.reservations.length - waiting)}</div>`, true);
}
function reservations() {
  if (!needAdmin("reservations")) return;
  layout("預約單管理", `<div class="grid">${db.reservations.map((r) => `<article class="card"><h3>${r.id}</h3><p>${r.name} ${r.phone}<br>${r.car} ${r.plate}<br>${r.store} ${r.time}</p><p>${orderText(r)}</p><span class="tag ${r.imported ? "green" : "orange"}">${r.imported ? "已匯入" : "待匯入"}</span><br><button onclick="importReservation('${r.id}')">匯入客戶系統</button></article>`).join("") || "<div class='empty'>目前沒有預約</div>"}</div>`, true);
}
function orderText(r) {
  const names = [...r.pack.map((id) => db.packages.find((p) => p.id === id)?.name), ...r.addon.map((id) => db.addons.find((a) => a.id === id)?.name)].filter(Boolean);
  return names.join("、") + "，" + nt(sumOrder(r.pack, r.addon));
}
function importReservation(id) {
  const r = db.reservations.find((x) => x.id === id);
  let c = db.customers.find((x) => x.phone === r.phone);
  if (!c) { c = { id: Date.now(), tags: [] }; db.customers.unshift(c); }
  Object.assign(c, { name: r.name, phone: r.phone, car: r.car, plate: r.plate, store: r.store, status: "已預約", deposit: "未收", appointment: r.time, tags: ["前台預約"] });
  r.imported = true;
  save();
  alert("已匯入客戶系統");
  reservations();
}
function customers() {
  if (!needAdmin("customers")) return;
  layout("客戶管理", `<div class="table-wrap"><table><thead><tr><th>客戶</th><th>車輛</th><th>狀態</th><th>門市/時間</th><th>標籤</th></tr></thead><tbody>${db.customers.map((c) => `<tr><td>${c.name}<br>${c.phone}</td><td>${c.car}<br>${c.plate}</td><td>${c.status}<br>${c.deposit}</td><td>${c.store}<br>${c.appointment || "-"}</td><td>${(c.tags || []).map((t) => `<span class="tag">${t}</span>`).join("")}</td></tr>`).join("")}</tbody></table></div>`, true);
}
function calendar() {
  if (!needAdmin("calendar")) return;
  layout("行事曆", `<div class="grid">${db.reservations.map((r) => `<article class="card"><h3>${r.time}</h3><p>${r.store} / ${r.name} / ${r.plate}<br>${orderText(r)}</p><button onclick="const t=prompt('新時間','${r.time}');if(t){r.time=t;save();calendar()}">修改時間</button></article>`).join("") || "<div class='empty'>目前沒有排程</div>"}</div>`, true);
}
function packages() {
  if (!needAdmin("packages")) return;
  layout("套餐管理", `<button onclick="db.packages.push({id:Date.now(),active:true,name:'新套餐',old:0,price:0,text:'請編輯',tags:['新']});save();packages()">新增套餐</button><div class="grid">${db.packages.map((p) => `<article class="card"><h3>${p.name}</h3><p>${p.text}</p><p>${nt(p.price)}</p><span class="tag ${p.active ? "green" : "red"}">${p.active ? "上架" : "下架"}</span><br><button onclick="editPackage(${p.id})">編輯</button><button class="secondary" onclick="p=db.packages.find(x=>x.id===${p.id});p.active=!p.active;save();packages()">上下架</button></article>`).join("")}</div>`, true);
}
function editPackage(id) {
  const p = db.packages.find((x) => x.id === id);
  p.name = prompt("套餐名", p.name) || p.name;
  p.price = Number(prompt("優惠價", p.price) || p.price);
  p.old = Number(prompt("原價", p.old) || p.old);
  p.text = prompt("介紹", p.text) || p.text;
  save();
  packages();
}
function addons() {
  if (!needAdmin("addons")) return;
  layout("加購管理", `<button onclick="db.addons.push({id:Date.now(),active:true,name:'新加購',price:0,text:'請編輯'});save();addons()">新增加購</button><div class="grid">${db.addons.map((a) => `<article class="card"><h3>${a.name}</h3><p>${a.text}</p><p>${nt(a.price)}</p><span class="tag ${a.active ? "green" : "red"}">${a.active ? "上架" : "下架"}</span><br><button onclick="editAddon(${a.id})">編輯</button><button class="secondary" onclick="a=db.addons.find(x=>x.id===${a.id});a.active=!a.active;save();addons()">上下架</button></article>`).join("")}</div>`, true);
}
function editAddon(id) {
  const a = db.addons.find((x) => x.id === id);
  a.name = prompt("加購名", a.name) || a.name;
  a.price = Number(prompt("價格", a.price) || a.price);
  a.text = prompt("說明", a.text) || a.text;
  save();
  addons();
}
function finance() {
  if (!needAdmin("finance")) return;
  if (!db.finance) return layout("財務二次驗證", `<section class="card login-card"><p class="muted">預設財務密碼：boss1688</p><div class="field"><label>財務密碼</label><input id="fpwd" type="password"></div><button class="gold" onclick="if(val('fpwd')==='${FINANCE_PASSWORD}'){db.finance=true;save();finance()}else alert('密碼錯誤')">進入財務</button></section>`, true);
  const revenue = db.reservations.reduce((s, r) => s + sumOrder(r.pack, r.addon), 0);
  const expense = db.expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  layout("財務專區", `<div class="grid cards">${stat("總營收", revenue)}${stat("總支出", expense)}${stat("淨利潤", revenue - expense)}</div><section class="card">${field("支出項目", "ename")}${field("支出金額", "eamount")}<button onclick="db.expenses.push({id:Date.now(),name:val('ename'),amount:Number(val('eamount'))});save();finance()">新增支出</button></section>`, true);
}
function stat(label, value) { return `<div class="card">${label}<div class="stat">${nt(value)}</div></div>`; }

function render() {
  const routes = { home, reserve, admin: adminLogin, dashboard, customers, reservations, calendar, packages, addons, finance };
  (routes[db.view] || home)();
}
render();
