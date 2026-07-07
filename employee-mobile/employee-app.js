const API_BASE = window.API_BASE || "";
const KEY = "employee-mobile-demo";
let state = JSON.parse(localStorage.getItem(KEY) || '{"view":"home","token":"","me":{"name":"測試員工","department":"三重門市","position":"美容技師"},"records":[]}');

function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function el(id){return document.getElementById(id)}
function val(id){return (el(id)?.value||"").trim()}
function api(path, options={}){
  return fetch(API_BASE + path, {
    ...options,
    headers: {"Content-Type":"application/json", ...(state.token ? {Authorization:"Bearer "+state.token} : {}), ...(options.headers||{})}
  }).then(r=>r.ok?r.json():Promise.reject(r));
}
function shell(body){
  el("app").innerHTML = `<section class="top"><h1>員工打卡</h1><p class="muted">${new Date().toLocaleDateString("zh-TW")} · ${state.me.name} · ${state.me.department}</p></section><section class="page">${body}</section><nav class="tabs"><button onclick="go('home')">打卡</button><button onclick="go('records')">紀錄</button><button onclick="go('apply')">申請</button><button onclick="go('profile')">我的</button></nav>`;
}
function go(view){state.view=view;save();render()}
function login(){
  shell(`<section class="card"><h2>員工登入</h2><input id="username" placeholder="員工帳號"><input id="password" type="password" placeholder="密碼"><button onclick="doLogin()">登入</button><p class="muted">若後端尚未部署，會以本機示範模式登入。</p></section>`)
}
function doLogin(){
  api("/api/auth/login",{method:"POST",body:JSON.stringify({type:"employee",username:val("username"),password:val("password")})}).then(data=>{
    state.token=data.token; state.me.name=data.name || val("username"); save(); go("home");
  }).catch(()=>{state.token="demo"; state.me.name=val("username")||"測試員工"; save(); go("home")});
}
function home(){
  shell(`<section class="card"><h2>今日考勤</h2><p>規定上班：09:00　規定下班：18:00</p><span class="tag">GPS 必填</span></section><section class="grid two"><button onclick="clock('CLOCK_IN')" class="gold">上班打卡</button><button onclick="clock('CLOCK_OUT')">下班打卡</button></section><section class="card"><h3>外勤打卡</h3><textarea id="fieldReason" placeholder="外勤事由"></textarea><button onclick="clock('FIELD')">送出外勤打卡</button></section>`);
}
function clock(type){
  navigator.geolocation.getCurrentPosition(pos=>{
    const payload={clockType:type,latitude:pos.coords.latitude,longitude:pos.coords.longitude,deviceId:navigator.userAgent,reason:val("fieldReason")};
    api("/api/employee/clock",{method:"POST",body:JSON.stringify(payload)}).catch(()=>payload).then(()=>{
      state.records.unshift({type,time:new Date().toISOString(),lat:payload.latitude,lng:payload.longitude,reason:payload.reason,status:type==="FIELD"?"外勤待審":"已送出"}); save(); alert("打卡已送出"); go("records");
    });
  },()=>alert("請允許 GPS 定位才能打卡"));
}
function records(){
  shell(`<section class="card"><h2>我的打卡紀錄</h2>${state.records.map(r=>`<p><b>${r.type}</b><br>${new Date(r.time).toLocaleString("zh-TW")}<br><span class="muted">${r.status}</span></p>`).join("")||"<p class='muted'>尚無紀錄</p>"}</section>`);
}
function apply(){
  shell(`<section class="card"><h2>補卡申請</h2><input id="targetDate" type="date"><select id="clockType"><option>CLOCK_IN</option><option>CLOCK_OUT</option></select><input id="requestedTime" type="time"><textarea id="reason" placeholder="原因"></textarea><button onclick="submitCorrection()">送出補卡</button></section><section class="card"><h2>請假 / 加班</h2><input id="startTime" type="datetime-local"><input id="endTime" type="datetime-local"><textarea id="applyReason" placeholder="原因"></textarea><button onclick="submitApply('leave')">請假申請</button><button onclick="submitApply('overtime')" class="ghost">加班申請</button></section>`);
}
function submitCorrection(){api("/api/employee/punch-correction",{method:"POST",body:JSON.stringify({targetDate:val("targetDate"),clockType:val("clockType"),requestedTime:val("requestedTime"),reason:val("reason")})}).catch(()=>({ok:true})).then(()=>alert("補卡申請已送出"))}
function submitApply(type){api(`/api/employee/${type}`,{method:"POST",body:JSON.stringify({startTime:val("startTime"),endTime:val("endTime"),reason:val("applyReason"),leaveType:"事假"})}).catch(()=>({ok:true})).then(()=>alert("申請已送出"))}
function profile(){shell(`<section class="card"><h2>個人中心</h2><p>姓名：${state.me.name}</p><p>部門：${state.me.department}</p><p>職位：${state.me.position}</p><button class="ghost" onclick="state.token='';save();render()">登出</button></section>`)}
function render(){if(!state.token)return login();({home,records,apply,profile}[state.view]||home)()}
render();
