(() => {
  const SAMPLE = `1.稱呼：
2.車型：
3.車牌：
4.電話：
5.預約的日期/時間：
6.預約的分店(台北/桃園/台中/高雄）：
7.預約方案項目：
8.預算：
9.最在意愛車的地方是？：
10.職業：
11.如何得知我們的(FB/IG/TK/GOOGLE/朋友)：
12.車輛其他問題備注：`;

  function clean(value) {
    return String(value || "").replace(/[()\uff08\uff09\s/？?的]/g, "").toLowerCase();
  }

  function readField(text, labels) {
    const wanted = [].concat(labels).map(clean);
    const normalizedText = String(text || "")
      .replace(/\s+(\d{1,2}\s*[.、．]\s*(稱呼|車型|車牌|電話|預約|預算|最在意|職業|如何|車輛))/g, "\n$1");
    const lines = normalizedText.split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.replace(/^\s*\d+\s*[.、．]?\s*/, "").trim();
      const normalized = clean(line);
      if (!wanted.some((label) => normalized.startsWith(label) || normalized.includes(label))) continue;
      const parts = line.split(/[：:]/);
      if (parts.length > 1) {
        return parts.slice(1).join(":")
          .replace(/\s*\d{1,2}\s*[.、．]\s*(稱呼|車型|車牌|電話|預約|預算|最在意|職業|如何|車輛).*$/u, "")
          .trim();
      }
    }
    return "";
  }

  function normalizeDateTime(raw) {
    const text = String(raw || "").trim();
    const dateMatch = text.match(/(\d{4})[\/\-.年](\d{1,2})[\/\-.月](\d{1,2})/);
    const shortDate = text.match(/(\d{1,2})[\/\-.月](\d{1,2})/);
    const timeMatch = text.match(/(\d{1,2})[:：點](\d{2})?/);
    const nowYear = new Date().getFullYear();
    let date = "";
    if (dateMatch) date = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
    else if (shortDate) date = `${nowYear}-${shortDate[1].padStart(2, "0")}-${shortDate[2].padStart(2, "0")}`;
    return {
      date,
      time: timeMatch ? `${timeMatch[1].padStart(2, "0")}:${(timeMatch[2] || "00").padStart(2, "0")}` : ""
    };
  }

  function setValue(id, value) {
    const node = document.getElementById(id);
    if (!node || value == null || value === "") return;
    node.value = value;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function chooseSelect(id, text) {
    const node = document.getElementById(id);
    if (!node || !text) return;
    const normalized = clean(text);
    const option = Array.from(node.options).find((item) => {
      const label = clean(item.textContent);
      const value = clean(item.value);
      return normalized.includes(label) || label.includes(normalized) || normalized.includes(value) || value.includes(normalized);
    });
    if (option) setValue(id, option.value);
  }

  function parseEvalPaste() {
    const source = document.getElementById("evalPasteText");
    if (!source) return;
    const text = source.value || "";
    const dateTime = normalizeDateTime(readField(text, ["預約的日期時間", "預約日期時間", "預約日期/時間"]));
    setValue("name", readField(text, ["稱呼"]));
    setValue("car", readField(text, ["車型"]));
    setValue("plate", readField(text, ["車牌"]));
    setValue("phone", readField(text, ["電話", "聯絡電話"]));
    setValue("date", dateTime.date);
    setValue("time", dateTime.time);
    chooseSelect("store", readField(text, ["預約的分店", "預約分店", "預約門市"]));
    chooseSelect("plan", readField(text, ["預約方案項目", "預約方案"]));
    setValue("budget", readField(text, ["預算"]));
    setValue("care", readField(text, ["最在意愛車的地方是", "最在意愛車"]));
    setValue("job", readField(text, ["職業"]));
    chooseSelect("source", readField(text, ["如何得知我們的", "如何得知我們"]));
    setValue("note", readField(text, ["車輛其他問題備注", "車輛其他問題備註", "備注", "備註"]));
    window.scheduleUiStabilize?.(80);
  }

  function injectEvalPasteBox() {
    const title = document.querySelector("h1")?.textContent || "";
    if (!title.includes("預約評估")) return;
    if (document.getElementById("evalPasteText")) return;
    const form = document.querySelector('form[data-form="order"]');
    if (!form) return;
    form.insertAdjacentHTML("beforebegin", `<section class="card eval-paste-card">
      <h2>複製貼上評估資料</h2>
      <p class="muted">貼上 12 項評估格式，按下按鈕後會自動填入下方預約評估表。</p>
      <textarea id="evalPasteText" style="min-height:230px">${SAMPLE}</textarea>
      <button type="button" class="gold" data-eval-paste-fill>自動填入評估表</button>
    </section>`);
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-eval-paste-fill]")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    parseEvalPaste();
  }, true);

  document.addEventListener("paste", (event) => {
    if (event.target?.id === "evalPasteText") setTimeout(parseEvalPaste, 100);
  }, true);

  document.addEventListener("DOMContentLoaded", injectEvalPasteBox);
  window.addEventListener("ui:stabilize", injectEvalPasteBox);
})();
