(() => {
  const KEY = "beauty-crm-v10";

  function currentDb() {
    try {
      return window.db || JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch (error) {
      return window.db || {};
    }
  }

  function esc(value) {
    return String(value || "").replace(/[&<>"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[char]));
  }

  function cleanLabel(value) {
    return String(value || "").replace(/[()\uff08\uff09\s/]+/g, "");
  }

  function readField(text, label) {
    const wanted = cleanLabel(label);
    const lines = String(text || "").split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine
        .replace(/^[\s\d①②③④⑤⑥⑦⑧⑨⑩0-9️⃣.、)）-]+/u, "")
        .trim();
      const normalized = cleanLabel(line);
      if (!normalized.includes(wanted)) continue;

      const parts = line.split(/[：:]/);
      if (parts.length > 1) return parts.slice(1).join(":").trim();
    }

    return "";
  }

  function choose(raw, list) {
    const text = String(raw || "").toLowerCase();
    return list.find((item) => {
      const option = String(item).toLowerCase();
      return text.includes(option) || option.includes(text);
    }) || list[0] || "";
  }

  function normalizeDateTime(raw) {
    const text = String(raw || "").trim();
    const dateMatch = text.match(/(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
    const timeMatch = text.match(/(\d{1,2})[:：](\d{2})/);
    let date = text.split(/\s+/)[0] || "";

    if (dateMatch) {
      date = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
    }

    return {
      date,
      time: timeMatch ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}` : ""
    };
  }

  function field(label, id, value = "") {
    return `<div class="field"><label>${label}</label><input id="${id}" value="${esc(value)}"></div>`;
  }

  function area(label, id, value = "") {
    return `<div class="field"><label>${label}</label><textarea id="${id}">${esc(value)}</textarea></div>`;
  }

  function select(label, id, items, value = "") {
    return `<div class="field"><label>${label}</label><select id="${id}">${items.map((item) => {
      const optionValue = typeof item === "string" ? item : item.value;
      const optionText = typeof item === "string" ? item : item.label;
      return `<option value="${esc(optionValue)}" ${String(optionValue) === String(value) ? "selected" : ""}>${esc(optionText)}</option>`;
    }).join("")}</select></div>`;
  }

  function multi(label, name, items) {
    return `<div class="field"><label>${label}</label>${items.map((item) => (
      `<label class="choice"><input type="checkbox" name="${name}" value="${esc(item.value)}"> ${esc(item.label)}</label>`
    )).join("")}</div>`;
  }

  function renderParsedForm() {
    const source = document.getElementById("pasteText");
    const target = document.getElementById("pasteResult");
    if (!source || !target) return;

    const text = source.value || "";
    const data = currentDb();
    const stores = data.cfg?.stores || ["三重", "桃園", "新竹", "台南"];
    const channels = data.cfg?.source || ["FB", "IG", "Google", "朋友介紹"];
    const payTypes = data.cfg?.pay || ["現金", "匯款", "刷卡", "定金"];
    const plans = data.cfg?.plans || [];
    const addons = data.cfg?.addons || [];

    const dateTime = normalizeDateTime(
      readField(text, "預約日期 / 時間") || readField(text, "預約日期") || readField(text, "預約時間")
    );
    const planText = readField(text, "預約方案");
    const matchedPlan = plans.find((plan) => planText.includes(plan.name) || plan.name.includes(planText)) || plans[0] || { id: "" };
    const planOptions = plans.map((plan) => ({
      value: plan.id,
      label: `${plan.name} $${Number(plan.price || 0).toLocaleString("zh-TW")}`
    }));
    const addonOptions = addons.map((addon) => ({
      value: addon.id,
      label: `${addon.name} $${Number(addon.price || 0).toLocaleString("zh-TW")}`
    }));

    target.innerHTML = `<form data-form="order" class="grid two paste-ready">
      <section class="card"><h2>已自動填入</h2>
        ${field("稱呼", "name", readField(text, "稱呼"))}
        ${field("聯絡電話", "phone", readField(text, "聯絡電話"))}
        ${field("車牌", "plate", readField(text, "車牌"))}
        ${field("車型", "car", readField(text, "車型"))}
        ${field("年份", "year", readField(text, "年份"))}
        ${select("預約門市", "store", stores, choose(readField(text, "預約門市"), stores))}
        ${field("預約日期", "date", dateTime.date)}
        ${field("預約時間", "time", dateTime.time)}
      </section>
      <section class="card"><h2>方案確認</h2>
        ${select("預約方案", "plan", planOptions, matchedPlan.id)}
        ${multi("加購項目", "addons", addonOptions)}
        ${select("如何得知我們", "source", channels, choose(readField(text, "如何得知我們"), channels))}
        ${select("付款方式", "pay", payTypes)}
        ${field("預算", "budget")}
        ${area("其它備註", "note", readField(text, "其它備註"))}
        <h3>總金額 <span class="price" id="sum">$0</span></h3>
        <button class="gold">確認建立預約</button>
      </section>
    </form>`;

    const planSelect = document.getElementById("plan");
    if (planSelect) planSelect.dispatchEvent(new Event("change", { bubbles: true }));
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest('button[data-act="parsePaste"]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    renderParsedForm();
  }, true);

  document.addEventListener("paste", (event) => {
    if (event.target?.id === "pasteText") setTimeout(renderParsedForm, 80);
  }, true);

  document.addEventListener("input", (event) => {
    if (event.target?.id !== "pasteText") return;
    clearTimeout(window.__pasteAutoTimer);
    window.__pasteAutoTimer = setTimeout(renderParsedForm, 250);
  }, true);
})();
