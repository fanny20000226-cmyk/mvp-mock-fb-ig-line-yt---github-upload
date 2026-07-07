(() => {
  const KEY = "beauty-crm-v10";
  const DEFAULT_BRAND = {
    name: "汽美工作台",
    logo: "",
    primary: "#1f8ff5",
    accent: "#ff7043",
    background: "#f7fbff"
  };

  function db() {
    const data = window.db || {};
    data.brand = data.brand || { ...DEFAULT_BRAND };
    return data;
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(db()));
  }

  function el(id) {
    return document.getElementById(id);
  }

  function value(id) {
    return (el(id)?.value || "").trim();
  }

  function esc(value) {
    return String(value || "").replace(/[&<>"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[char]));
  }

  function button(label, attrs = "", cls = "") {
    return `<button class="${cls}" ${attrs}>${label}</button>`;
  }

  function field(label, id, val = "", type = "text") {
    return `<div class="field"><label>${label}</label><input id="${id}" type="${type}" value="${esc(val)}"></div>`;
  }

  function applyBrand() {
    const brand = { ...DEFAULT_BRAND, ...(db().brand || {}) };
    const signature = `${brand.name}|${brand.logo}|${brand.primary}|${brand.accent}|${brand.background}`;
    document.documentElement.style.setProperty("--blue", brand.primary);
    document.documentElement.style.setProperty("--orange", brand.accent);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", brand.background || brand.primary);
    document.title = `${brand.name || "汽美工作台"} PWA`;

    let style = document.getElementById("brand-dynamic-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "brand-dynamic-style";
      document.head.appendChild(style);
    }
    const css = `
      body{background:linear-gradient(180deg,${brand.background} 0%,#f3f6fb 52%,#f7f8fb 100%)}
      button:not(.ghost):not(.secondary):not(.tool){background:linear-gradient(135deg,${brand.primary},${shade(brand.primary, -18)})}
      .bottom-nav button{background:transparent;color:#8a96a8;box-shadow:none}
      button.gold,.todo button{background:linear-gradient(135deg,${shade(brand.accent, 10)},${brand.accent})}
      .tool strong,.bottom-nav button.active strong{background:linear-gradient(135deg,${brand.primary},${brand.accent})}
      .bottom-nav button.active{color:${brand.primary};background:${hexToRgba(brand.primary, .10)}}
      .price{color:${brand.accent}}
    `;
    if (style.textContent !== css) style.textContent = css;

    document.querySelectorAll(".topbar").forEach((bar) => {
      const titleBox = bar.querySelector("div");
      if (!titleBox) return;
      titleBox.classList.add("brand-title-row");
      const current = titleBox.querySelector(".brand-logo-wrap");
      if (!current) titleBox.insertAdjacentHTML("afterbegin", logoHtml(brand, signature));
      else if (current.dataset.brandSignature !== signature) current.outerHTML = logoHtml(brand, signature);
    });
  }

  function logoHtml(brand, signature = "") {
    if (brand.logo) return `<span class="brand-logo-wrap" data-brand-signature="${esc(signature)}"><img src="${brand.logo}" alt="${esc(brand.name)}"></span>`;
    return `<span class="brand-logo-wrap brand-logo-text" data-brand-signature="${esc(signature)}">${esc((brand.name || "汽").slice(0, 1))}</span>`;
  }

  function shade(hex, percent) {
    const raw = String(hex || "#1f8ff5").replace("#", "");
    const num = parseInt(raw.length === 3 ? raw.split("").map((x) => x + x).join("") : raw, 16);
    const amt = Math.round(2.55 * percent);
    const r = Math.max(0, Math.min(255, (num >> 16) + amt));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amt));
    const b = Math.max(0, Math.min(255, (num & 255) + amt));
    return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
  }

  function hexToRgba(hex, alpha) {
    const raw = String(hex || "#1f8ff5").replace("#", "");
    const full = raw.length === 3 ? raw.split("").map((x) => x + x).join("") : raw;
    const num = parseInt(full, 16);
    return `rgba(${num >> 16},${(num >> 8) & 255},${num & 255},${alpha})`;
  }

  function shell(title, body) {
    if (!db().authed && window.go) return window.go("adminLogin");
    el("app").innerHTML = `<header class="topbar worktop">
      <div><h1>${title}</h1><small>管理後台 · 品牌外觀</small></div>
      ${button("回前台", 'data-go="home"', "ghost")}
    </header>
    <div class="admin-menu">
      ${button("總覽", 'data-go="adminHome"')}
      ${button("品牌設定", 'data-brand-go="settings"')}
      ${button("圖片菜單管理", 'data-ext-go="menuAdmin"')}
      ${button("店長副店長", 'data-role-go="roleStaff"')}
      ${button("報表", 'data-go="reports"')}
    </div>
    <main class="page">${body}</main>`;
    applyBrand();
  }

  function brandSettings() {
    const brand = { ...DEFAULT_BRAND, ...(db().brand || {}) };
    shell("品牌設定", `<section class="card">
      <h2>Logo 與顏色</h2>
      <div class="brand-editor">
        <div>
          <label class="upload-box">
            <input id="brandLogoFile" type="file" accept="image/*">
            <span>上傳 / 替換 Logo</span>
          </label>
          <div id="brandPreview" class="brand-preview">${brand.logo ? `<img src="${brand.logo}" alt="">` : logoHtml(brand)}</div>
          ${button("移除 Logo", 'data-brand-action="clearLogo"', "secondary")}
        </div>
        <div>
          ${field("品牌名稱", "brandName", brand.name)}
          ${field("主色", "brandPrimary", brand.primary, "color")}
          ${field("強調色", "brandAccent", brand.accent, "color")}
          ${field("背景色", "brandBackground", brand.background, "color")}
          <input id="brandLogoData" type="hidden" value="${esc(brand.logo)}">
          <div class="row">
            ${button("儲存品牌設定", 'data-brand-action="save"', "gold")}
            ${button("恢復預設", 'data-brand-action="reset"', "secondary")}
          </div>
        </div>
      </div>
    </section>
    <section class="card">
      <h2>預覽</h2>
      <div class="brand-preview-card">
        ${logoHtml(brand)}
        <div><b>${esc(brand.name)}</b><p class="muted">手機桌面捷徑與系統抬頭會使用這個名稱。</p></div>
      </div>
    </section>`);
  }

  function saveBrand() {
    db().brand = {
      name: value("brandName") || DEFAULT_BRAND.name,
      logo: value("brandLogoData"),
      primary: value("brandPrimary") || DEFAULT_BRAND.primary,
      accent: value("brandAccent") || DEFAULT_BRAND.accent,
      background: value("brandBackground") || DEFAULT_BRAND.background
    };
    save();
    applyBrand();
    alert("品牌設定已儲存");
    brandSettings();
  }

  function enhance() {
    applyBrand();
    const menu = document.querySelector(".admin-menu");
    if (menu && !menu.querySelector('[data-brand-go="settings"]')) {
      menu.insertAdjacentHTML("afterbegin", '<button data-brand-go="settings">品牌設定</button>');
    }
    const grid = document.querySelector(".tool-grid");
    if (grid && db().authed && !grid.querySelector('[data-brand-go="settings"]')) {
      grid.insertAdjacentHTML("beforeend", '<button class="tool" data-brand-go="settings"><strong>色</strong><span>品牌設定</span></button>');
    }
  }

  document.addEventListener("click", (event) => {
    const route = event.target.closest("[data-brand-go]");
    if (route) {
      event.preventDefault();
      event.stopImmediatePropagation();
      brandSettings();
      return;
    }

    const action = event.target.closest("[data-brand-action]");
    if (!action) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (action.dataset.brandAction === "save") saveBrand();
    if (action.dataset.brandAction === "reset") {
      db().brand = { ...DEFAULT_BRAND };
      save();
      brandSettings();
    }
    if (action.dataset.brandAction === "clearLogo") {
      const hidden = el("brandLogoData");
      const preview = el("brandPreview");
      if (hidden) hidden.value = "";
      if (preview) preview.innerHTML = logoHtml({ ...db().brand, logo: "" });
    }
  }, true);

  document.addEventListener("change", (event) => {
    if (event.target.id !== "brandLogoFile") return;
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const hidden = el("brandLogoData");
      const preview = el("brandPreview");
      if (hidden) hidden.value = reader.result;
      if (preview) preview.innerHTML = `<img src="${reader.result}" alt="">`;
    };
    reader.readAsDataURL(file);
  }, true);

  let enhanceQueued = false;
  new MutationObserver(() => {
    if (enhanceQueued) return;
    enhanceQueued = true;
    requestAnimationFrame(() => {
      enhanceQueued = false;
      enhance();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(enhance, 100);
})();
