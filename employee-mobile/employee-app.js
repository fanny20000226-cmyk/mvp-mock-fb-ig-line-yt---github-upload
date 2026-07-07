const API_BASE = window.API_BASE || "";
const KEY = "employee-mobile-demo";
const MAIN_KEY = "beauty-crm-v10";

let state = JSON.parse(localStorage.getItem(KEY) || JSON.stringify({
  view: "home",
  token: "",
  me: { id: "E001", username: "emp001", name: "示範員工", department: "三重門市", position: "美容技師" },
  records: []
}));

function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function mainDb() { return JSON.parse(localStorage.getItem(MAIN_KEY) || "{}"); }
function saveMain(db) { localStorage.setItem(MAIN_KEY, JSON.stringify(db)); }
function syncMain(mutator) {
  const db = mainDb();
  db.hrEmployees ||= [{ id: "E001", username: "emp001", password: "Emp@123456", name: "示範員工", department: "三重門市", position: "美容技師", role: "EMPLOYEE", active: true }];
  db.attendanceRules ||= [{ id: "AR001", department: "三重門市", workStart: "09:00", workEnd: "18:00", lateGrace: 5, active: true }];
  db.clockRecords ||= [];
  db.leaveRequests ||= [];
  db.overtimeRequests ||= [];
  db.punchFixRequests ||= [];
  db.fieldClockReviews ||= [];
  db.systemLogs ||= [];
  mutator(db);
  saveMain(db);
}
function el(id) { return document.getElementById(id); }
function val(id) { return (el(id)?.value || "").trim(); }
function esc(v) { return String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function todayText() { return new Date().toLocaleDateString("zh-TW", { weekday: "long", year: "numeric", month: "2-digit", day: "2-digit" }); }
function api(path, options = {}) {
  return fetch(API_BASE + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}), ...(options.headers || {}) }
  }).then((r) => (r.ok ? r.json() : Promise.reject(r)));
}
function getRule() {
  const db = mainDb();
  return (db.attendanceRules || []).find((x) => x.department === state.me.department && x.active !== false) || { workStart: "09:00", workEnd: "18:00", lateGrace: 5 };
}
function statusFor(type) {
  const rule = getRule();
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = String(rule.workStart || "09:00").split(":").map(Number);
  const [eh, em] = String(rule.workEnd || "18:00").split(":").map(Number);
  if (type === "CLOCK_IN" && minutes > sh * 60 + sm + Number(rule.lateGrace || 0)) return "遲到";
  if (type === "CLOCK_OUT" && minutes < eh * 60 + em) return "早退";
  if (type === "FIELD") return "外勤待審核";
  return "正常";
}
function shell(body) {
  const rule = getRule();
  el("app").innerHTML = `<section class="top">
    <h1>員工打卡</h1>
    <p class="muted">${todayText()}｜${esc(state.me.name)}｜${esc(state.me.department)}</p>
    <p class="muted">規定上班 ${esc(rule.workStart)}　下班 ${esc(rule.workEnd)}</p>
  </section>
  <section class="page">${body}</section>
  <nav class="tabs">
    <button onclick="go('home')">打卡</button>
    <button onclick="go('records')">紀錄</button>
    <button onclick="go('apply')">申請</button>
    <button onclick="go('profile')">我的</button>
  </nav>`;
}
function go(view) { state.view = view; save(); render(); }
function login() {
  el("app").innerHTML = `<section class="top"><h1>員工登入</h1><p class="muted">用人資建立的員工帳號登入</p></section>
  <section class="page"><section class="card">
    <label>帳號</label><input id="username" placeholder="例如 emp001" autocomplete="username">
    <label>密碼</label><input id="password" type="password" placeholder="請輸入密碼" autocomplete="current-password">
    <button onclick="doLogin()">登入打卡</button>
    <p class="muted">示範帳號：emp001 / Emp@123456</p>
  </section></section>`;
}
function doLogin() {
  api("/api/auth/login", { method: "POST", body: JSON.stringify({ type: "employee", username: val("username"), password: val("password") }) })
    .then((res) => {
      state.token = res.token || "server";
      state.me = { id: res.id || val("username"), username: val("username"), name: res.name || val("username"), department: res.department || "門市", position: res.position || "員工" };
      save();
      go("home");
    })
    .catch(() => {
      const db = mainDb();
      const employee = (db.hrEmployees || []).find((x) => x.username === val("username") && x.password === val("password") && x.active !== false);
      if (!employee) return alert("帳號或密碼錯誤，請先到後台人資管理建立員工。");
      state.token = "local";
      state.me = { id: employee.id, username: employee.username, name: employee.name, department: employee.department, position: employee.position };
      save();
      go("home");
    });
}
function home() {
  shell(`<section class="card">
    <h2>今日打卡</h2>
    <p class="muted">打卡會記錄 GPS、設備資訊，並同步到後台人資管理。</p>
    <span class="tag">GPS 定位必填</span>
  </section>
  <section class="grid two">
    <button onclick="clock('CLOCK_IN')" class="gold">上班打卡</button>
    <button onclick="clock('CLOCK_OUT')">下班打卡</button>
  </section>
  <section class="card">
    <h3>外勤打卡</h3>
    <textarea id="fieldReason" placeholder="請填寫外勤事由"></textarea>
    <button onclick="clock('FIELD')">送出外勤打卡</button>
  </section>`);
}
function clock(type) {
  navigator.geolocation.getCurrentPosition((pos) => {
    const record = {
      id: `CR${Date.now()}`,
      employeeId: state.me.id,
      employeeName: state.me.name,
      department: state.me.department,
      clockType: type,
      clockTime: new Date().toISOString(),
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      deviceId: navigator.userAgent,
      reason: val("fieldReason"),
      status: statusFor(type),
      auditStatus: type === "FIELD" ? "待審核" : "自動判定"
    };
    api("/api/employee/clock", { method: "POST", body: JSON.stringify(record) }).catch(() => record).then(() => {
      state.records.unshift(record);
      syncMain((db) => {
        db.clockRecords.unshift(record);
        if (type === "FIELD") db.fieldClockReviews.unshift(record);
        db.systemLogs.unshift({ id: `LOG${Date.now()}`, actor: state.me.username, action: "員工打卡", module: "hr", ip: "local-pwa", time: new Date().toLocaleString("zh-TW") });
      });
      save();
      alert("打卡成功，已同步到後台人資。");
      go("records");
    });
  }, () => alert("請允許 GPS 定位，才能完成打卡。"));
}
function records() {
  const rows = state.records.map((r) => `<p><b>${esc(r.clockType)}</b><br>${new Date(r.clockTime).toLocaleString("zh-TW")}<br><span class="muted">${esc(r.status)}｜${esc(r.reason)}</span></p>`).join("");
  shell(`<section class="card"><h2>我的打卡紀錄</h2>${rows || "<p class='muted'>目前沒有紀錄</p>"}</section>`);
}
function apply() {
  shell(`<section class="card"><h2>補卡申請</h2>
    <input id="targetDate" type="date">
    <select id="clockType"><option value="CLOCK_IN">上班</option><option value="CLOCK_OUT">下班</option></select>
    <input id="requestedTime" type="time">
    <textarea id="reason" placeholder="請填寫補卡原因"></textarea>
    <button onclick="submitCorrection()">送出補卡</button>
  </section>
  <section class="card"><h2>請假 / 加班</h2>
    <input id="startTime" type="datetime-local">
    <input id="endTime" type="datetime-local">
    <textarea id="applyReason" placeholder="請填寫原因"></textarea>
    <button onclick="submitApply('leave')">請假申請</button>
    <button onclick="submitApply('overtime')" class="ghost">加班申請</button>
  </section>`);
}
function submitCorrection() {
  const row = { id: `PF${Date.now()}`, employeeId: state.me.id, employeeName: state.me.name, targetDate: val("targetDate"), clockType: val("clockType"), requestedTime: val("requestedTime"), reason: val("reason"), status: "待審核", createdAt: new Date().toISOString() };
  api("/api/employee/punch-correction", { method: "POST", body: JSON.stringify(row) }).catch(() => row).then(() => {
    syncMain((db) => db.punchFixRequests.unshift(row));
    alert("補卡申請已送出。");
  });
}
function submitApply(type) {
  const row = { id: `${type.toUpperCase()}${Date.now()}`, employeeId: state.me.id, employeeName: state.me.name, startTime: val("startTime"), endTime: val("endTime"), reason: val("applyReason"), status: "待審核", createdAt: new Date().toISOString() };
  api(`/api/employee/${type}`, { method: "POST", body: JSON.stringify(row) }).catch(() => row).then(() => {
    syncMain((db) => db[type === "leave" ? "leaveRequests" : "overtimeRequests"].unshift(row));
    alert("申請已送出。");
  });
}
function profile() {
  shell(`<section class="card"><h2>個人資料</h2>
    <p>姓名：${esc(state.me.name)}</p>
    <p>部門：${esc(state.me.department)}</p>
    <p>職位：${esc(state.me.position)}</p>
    <button class="ghost" onclick="state.token='';save();render()">登出</button>
  </section>`);
}
function render() {
  if (!state.token) return login();
  ({ home, records, apply, profile }[state.view] || home)();
}
render();
