(() => {
  const KEY = "beauty-crm-v10";

  function db() {
    const data = window.db || {};
    data.roleStaff = data.roleStaff || [
      { id: "S001", name: "阿凱", phone: "0911000111", store: "三重", role: "正店長", password: "", active: true, note: "可審核支出與預約異動" },
      { id: "S002", name: "Mina", phone: "0922000222", store: "桃園", role: "副店長", password: "", active: true, note: "可填報支出與協助審核" },
      { id: "S003", name: "小芳", phone: "0933000333", store: "新竹", role: "普通店員", password: "", active: true, note: "前台預約與施工相冊" }
    ];
    data.roleLogs = data.roleLogs || [];
    return data;
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(db()));
  }

  function text(value) {
    return String(value || "").replace(/[&<>"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[char]));
  }

  function el(id) {
    return document.getElementById(id);
  }

  function value(id) {
    return (el(id)?.value || "").trim();
  }

  function button(label, attrs = "", cls = "") {
    return `<button class="${cls}" ${attrs}>${label}</button>`;
  }

  function field(label, id, val = "", type = "text") {
    return `<div class="field"><label>${label}</label><input id="${id}" type="${type}" value="${text(val)}"></div>`;
  }

  function area(label, id, val = "") {
    return `<div class="field"><label>${label}</label><textarea id="${id}">${text(val)}</textarea></div>`;
  }

  function select(label, id, items, selected = "") {
    return `<div class="field"><label>${label}</label><select id="${id}">${items.map((item) => (
      `<option value="${text(item)}" ${String(item) === String(selected) ? "selected" : ""}>${text(item)}</option>`
    )).join("")}</select></div>`;
  }

  function stores() {
    return db().cfg?.stores || ["三重", "桃園", "新竹", "台南", "台北", "台中", "高雄"];
  }

  function shell(title, body) {
    const loggedIn = !!db().authed;
    if (!loggedIn && window.go) return window.go("adminLogin");
    el("app").innerHTML = `<header class="topbar worktop">
      <div><h1>${title}</h1><small>管理後台 · 人員權限格式</small></div>
      ${button("回前台", 'data-go="home"', "ghost")}
    </header>
    <div class="admin-menu">
      ${button("總覽", 'data-go="adminHome"')}
      ${button("店長副店長", 'data-role-go="roleStaff"')}
      ${button("施工人員", 'data-go="workers"')}
      ${button("圖片菜單管理", 'data-ext-go="menuAdmin"')}
      ${button("取消預約列表", 'data-ext-go="cancelAdmin"')}
      ${button("報表", 'data-go="reports"')}
    </div>
    <main class="page">${body}</main>`;
  }

  function roleBadge(role) {
    const cls = role === "超級管理員" ? "red" : role === "正店長" || role === "副店長" ? "orange" : "green";
    return `<span class="tag ${cls}">${text(role)}</span>`;
  }

  function permissionText(role) {
    const map = {
      "普通店員": "預約建立、價目瀏覽、施工相冊上傳",
      "副店長": "普通店員權限 + 支出填報 + 協助處理改期取消",
      "正店長": "副店長權限 + 門市資料審核 + 報表查看",
      "超級管理員": "全部後台設定、財務、菜單、報表、人員權限"
    };
    return map[role] || "未設定";
  }

  function roleStaff(editId = "") {
    const data = db();
    const item = data.roleStaff.find((staff) => staff.id === editId) || {};
    const keyword = value("roleKeyword");
    const storeFilter = value("roleStore");
    const roleFilter = value("roleFilter");
    const rows = data.roleStaff.filter((staff) => {
      const haystack = [staff.id, staff.name, staff.phone, staff.store, staff.role].join(" ");
      return (!keyword || haystack.includes(keyword)) &&
        (!storeFilter || staff.store === storeFilter) &&
        (!roleFilter || staff.role === roleFilter);
    });

    shell("店長 / 副店長人員管理", `<section class="card">
      <h2>${item.id ? "編輯人員格式" : "新增人員格式"}</h2>
      <input id="roleId" type="hidden" value="${text(item.id || "")}">
      <section class="grid two">
        ${field("人員編號", "roleCode", item.id || "")}
        ${field("姓名", "roleName", item.name || "")}
        ${field("聯絡電話", "rolePhone", item.phone || "")}
        ${select("負責門市", "roleStoreInput", stores(), item.store || stores()[0])}
        ${select("角色權限", "roleNameInput", ["普通店員", "副店長", "正店長", "超級管理員"], item.role || "普通店員")}
        ${field("店長/副店長操作密碼", "rolePassword", "", "password")}
      </section>
      ${area("備註", "roleNote", item.note || "")}
      <label class="choice"><input id="roleActive" type="checkbox" ${item.active !== false ? "checked" : ""}> 啟用此人員</label>
      <div class="row">${button(item.id ? "儲存修改" : "新增人員", 'data-role-action="save"', "gold")}${button("清空", 'data-role-go="roleStaff"', "secondary")}</div>
    </section>

    <section class="card row">
      ${field("搜尋姓名/電話/角色", "roleKeyword", keyword)}
      ${select("門市篩選", "roleStore", [""].concat(stores()), storeFilter)}
      ${select("角色篩選", "roleFilter", ["", "普通店員", "副店長", "正店長", "超級管理員"], roleFilter)}
      ${button("篩選", 'data-role-go="roleStaff"')}
      ${button("匯出Excel", 'data-role-action="export"', "gold")}
    </section>

    <section class="table-wrap"><table>
      <thead><tr><th>編號</th><th>姓名 / 電話</th><th>門市</th><th>角色</th><th>權限格式</th><th>狀態</th><th>操作</th></tr></thead>
      <tbody>${rows.map((staff) => `<tr>
        <td>${text(staff.id)}</td>
        <td>${text(staff.name)}<br>${text(staff.phone)}</td>
        <td>${text(staff.store)}</td>
        <td>${roleBadge(staff.role)}</td>
        <td>${permissionText(staff.role)}</td>
        <td>${staff.active === false ? '<span class="tag red">停用</span>' : '<span class="tag green">啟用</span>'}</td>
        <td>${button("編輯", `data-role-edit="${staff.id}"`)}${button(staff.active === false ? "啟用" : "停用", `data-role-toggle="${staff.id}"`, "secondary")}</td>
      </tr>`).join("") || '<tr><td colspan="7">尚無人員資料</td></tr>'}</tbody>
    </table></section>

    <section class="card"><h2>固定權限說明</h2>
      <p><b>普通店員：</b>預約建立、價目瀏覽、施工相冊上傳。</p>
      <p><b>副店長：</b>普通店員權限 + 支出填報 + 協助處理改期取消。</p>
      <p><b>正店長：</b>副店長權限 + 門市資料審核 + 報表查看。</p>
      <p><b>超級管理員：</b>全部後台設定、財務、菜單、報表、人員權限。</p>
    </section>`);
  }

  function saveRoleStaff() {
    const data = db();
    const oldId = value("roleId");
    const id = value("roleCode") || oldId || `S${Date.now()}`;
    const password = value("rolePassword");
    const payload = {
      id,
      name: value("roleName"),
      phone: value("rolePhone"),
      store: value("roleStoreInput"),
      role: value("roleNameInput"),
      active: !!el("roleActive")?.checked,
      note: value("roleNote")
    };
    if (password) payload.password = password;

    const index = data.roleStaff.findIndex((staff) => staff.id === oldId || staff.id === id);
    if (index >= 0) data.roleStaff[index] = { ...data.roleStaff[index], ...payload };
    else data.roleStaff.unshift({ ...payload, password: password || "", createdAt: new Date().toISOString() });

    data.roleLogs.unshift(`${new Date().toLocaleString("zh-TW")} ${index >= 0 ? "更新" : "新增"} ${payload.role} ${payload.name}`);
    save();
    roleStaff();
  }

  function toggleRoleStaff(id) {
    const staff = db().roleStaff.find((item) => item.id === id);
    if (!staff) return;
    staff.active = !staff.active;
    db().roleLogs.unshift(`${new Date().toLocaleString("zh-TW")} ${staff.active ? "啟用" : "停用"} ${staff.name}`);
    save();
    roleStaff();
  }

  function exportRoleStaff() {
    const rows = [
      "人員編號,姓名,聯絡電話,負責門市,角色權限,啟用狀態,備註",
      ...db().roleStaff.map((staff) => [staff.id, staff.name, staff.phone, staff.store, staff.role, staff.active === false ? "停用" : "啟用", staff.note || ""].join(","))
    ];
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff" + rows.join("\n")], { type: "text/csv" }));
    link.download = "role-staff.csv";
    link.click();
  }

  function enhance() {
    const menu = document.querySelector(".admin-menu");
    if (menu && !menu.querySelector('[data-role-go="roleStaff"]')) {
      menu.insertAdjacentHTML("afterbegin", '<button data-role-go="roleStaff">店長副店長</button>');
    }
    const grid = document.querySelector(".tool-grid");
    if (grid && db().authed && !grid.querySelector('[data-role-go="roleStaff"]')) {
      grid.insertAdjacentHTML("beforeend", '<button class="tool" data-role-go="roleStaff"><strong>店</strong><span>店長副店長</span></button>');
    }
  }

  document.addEventListener("click", (event) => {
    const route = event.target.closest("[data-role-go]");
    if (route) {
      event.preventDefault();
      event.stopImmediatePropagation();
      roleStaff();
      return;
    }

    const action = event.target.closest("[data-role-action]");
    if (action) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (action.dataset.roleAction === "save") saveRoleStaff();
      if (action.dataset.roleAction === "export") exportRoleStaff();
      return;
    }

    const edit = event.target.closest("[data-role-edit]");
    if (edit) {
      event.preventDefault();
      event.stopImmediatePropagation();
      roleStaff(edit.dataset.roleEdit);
      return;
    }

    const toggle = event.target.closest("[data-role-toggle]");
    if (toggle) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleRoleStaff(toggle.dataset.roleToggle);
    }
  }, true);

  let enhanceRuns = 0;
  const enhanceTimer = setInterval(() => {
    enhance();
    enhanceRuns += 1;
    if (enhanceRuns > 20) clearInterval(enhanceTimer);
  }, 300);
  document.addEventListener("click", () => setTimeout(enhance, 80), true);
  setTimeout(enhance, 100);
})();
