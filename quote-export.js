(() => {
  const KEY = "beauty-crm-v10";
  const QUOTE_STATUS = {
    DRAFT: "待確認",
    CONFIRMED: "已確認",
    CONVERTED: "已轉工單",
    VOID: "已作廢"
  };

  function db() {
    const data = window.db || JSON.parse(localStorage.getItem(KEY) || "{}");
    data.quoteEstimates ||= seedQuotes(data);
    data.quoteEstimateItems ||= seedQuoteItems(data.quoteEstimates);
    data.quoteWorkOrders ||= [];
    data.servicePriceDict ||= seedServiceDict(data);
    window.db = data;
    return data;
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(db()));
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[char]));
  }

  function money(value) {
    return `$${Number(value || 0).toLocaleString("zh-TW")}`;
  }

  function canExport() {
    const role = db().currentRole || db().role || "SUPER_ADMIN";
    return !["TECHNICIAN", "技師", "EMPLOYEE"].includes(role);
  }

  function seedQuotes(data) {
    const order = (data.orders || [])[0] || {};
    return [{
      quote_id: "Q20260709001",
      store_code: order.store || "三重",
      store_name: `${order.store || "三重"}汽車美容`,
      customer_name: order.name || "王先生",
      phone: order.phone || "0911222333",
      plate: order.plate || "ABC-1234",
      car_model: order.car || "Tesla Model Y",
      car_year: "2024",
      package_total: 1500,
      addon_total: 1800,
      discount_amount: 300,
      deposit_amount: 500,
      appointment_date: order.date || "2026-07-10 10:00",
      remark: "示範報價單，可直接匯出 PDF 或圖片給客戶確認。",
      status: QUOTE_STATUS.DRAFT,
      created_by: "admin",
      created_at: new Date().toISOString(),
      pdf_file_path: "",
      img_file_path: ""
    }];
  }

  function seedQuoteItems(quotes) {
    const quoteId = quotes[0]?.quote_id || "Q20260709001";
    return [
      { quote_id: quoteId, category: "整新套餐", item_name: "9999 內外超值整新", unit_price: 1500, qty: 1 },
      { quote_id: quoteId, category: "玻璃系列", item_name: "玻璃油膜處理", unit_price: 800, qty: 1 },
      { quote_id: quoteId, category: "內裝系列", item_name: "寵物異味加強", unit_price: 1000, qty: 1 },
      { quote_id: quoteId, category: "贈品", item_name: "雨季玻璃檢查", unit_price: 0, qty: 1 }
    ];
  }

  function seedServiceDict(data) {
    const menu = data.menus || data.packages || [];
    const fromMenu = menu.map((item, index) => ({
      service_code: item.id || `S${index + 1}`,
      name: item.name || item.title || "未命名服務",
      category: item.category || "套餐",
      price: Number(item.price || item.salePrice || 0)
    }));
    return fromMenu.length ? fromMenu : [
      { service_code: "PKG-9999", name: "9999 內外超值整新", category: "整新套餐", price: 9999 },
      { service_code: "ADD-GLASS", name: "玻璃油膜處理", category: "玻璃系列", price: 800 },
      { service_code: "ADD-PET", name: "寵物異味加強", category: "內裝系列", price: 1000 }
    ];
  }

  function getQuote(quoteId) {
    return db().quoteEstimates.find((quote) => quote.quote_id === quoteId);
  }

  function getItems(quoteId) {
    return db().quoteEstimateItems.filter((item) => item.quote_id === quoteId);
  }

  function groupedItems(quoteId) {
    return getItems(quoteId).reduce((groups, item) => {
      const key = item.category || "其他系列";
      groups[key] ||= [];
      groups[key].push(item);
      return groups;
    }, {});
  }

  function total(quote) {
    return Number(quote.package_total || 0) + Number(quote.addon_total || 0) - Number(quote.discount_amount || 0);
  }

  function quoteHtml(quote) {
    const groups = groupedItems(quote.quote_id);
    const itemRows = Object.entries(groups).map(([category, items]) => `
      <section class="quote-section">
        <h3>${esc(category)}</h3>
        <table>
          <thead><tr><th>項目</th><th>單價</th><th>數量</th><th>小計</th></tr></thead>
          <tbody>
            ${items.map((item) => `
              <tr>
                <td>${esc(item.item_name)}</td>
                <td>${money(item.unit_price)}</td>
                <td>${esc(item.qty || 1)}</td>
                <td>${money(Number(item.unit_price || 0) * Number(item.qty || 1))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>
    `).join("");

    return `
      <article class="quote-paper">
        <header class="quote-header">
          <div class="quote-logo">汽</div>
          <div>
            <h2>${esc(quote.store_name || "汽車美容門市")}</h2>
            <p>報價單編號：${esc(quote.quote_id)}　建立時間：${new Date(quote.created_at || Date.now()).toLocaleString("zh-TW")}</p>
          </div>
        </header>
        <div class="quote-info">
          <span>車主：${esc(quote.customer_name)}</span>
          <span>電話：${esc(quote.phone)}</span>
          <span>車牌：${esc(quote.plate)}</span>
          <span>車型：${esc(quote.car_model)}</span>
          <span>年份：${esc(quote.car_year)}</span>
          <span>預約：${esc(quote.appointment_date)}</span>
        </div>
        ${itemRows}
        <section class="quote-total">
          <p>基礎套餐合計 <b>${money(quote.package_total)}</b></p>
          <p>加購項目合計 <b>${money(quote.addon_total)}</b></p>
          <p>優惠折扣 <b>-${money(quote.discount_amount)}</b></p>
          <p class="quote-payable">最終應付總價 <b>${money(total(quote))}</b></p>
          <p>已收訂金 <b>${money(quote.deposit_amount)}</b></p>
        </section>
        <p class="quote-note">備註：${esc(quote.remark || "轎車車型以上或車輛過髒等會另外酌收清潔費")}</p>
        <footer class="quote-sign">
          <span>門店確認簽名：________________</span>
          <span>客戶確認簽名：________________</span>
        </footer>
      </article>
    `;
  }

  function textForPdf(quote) {
    const items = getItems(quote.quote_id)
      .map((item) => `${item.category} / ${item.item_name} / ${money(item.unit_price)} x ${item.qty || 1}`)
      .join("\n");
    return [
      `${quote.store_name} 報價單`,
      `報價單編號：${quote.quote_id}`,
      `車主：${quote.customer_name}`,
      `電話：${quote.phone}`,
      `車牌：${quote.plate}`,
      `車型：${quote.car_model}`,
      `年份：${quote.car_year}`,
      "",
      items,
      "",
      `基礎套餐合計：${money(quote.package_total)}`,
      `加購項目合計：${money(quote.addon_total)}`,
      `優惠折扣：-${money(quote.discount_amount)}`,
      `最終應付總價：${money(total(quote))}`,
      `已收訂金：${money(quote.deposit_amount)}`,
      "",
      "轎車車型以上或車輛過髒等會另外酌收清潔費",
      "門店確認簽名：________________",
      "客戶確認簽名：________________"
    ].join("\n");
  }

  function makePdfBlob(text) {
    const safe = text.replace(/[^\x20-\x7E\n]/g, "?").split("\n");
    const body = safe.map((line, index) => `BT /F1 12 Tf 50 ${760 - index * 18} Td (${line.replace(/[()\\]/g, "\\$&")}) Tj ET`).join("\n");
    const objects = [
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
      "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
      `5 0 obj << /Length ${body.length} >> stream\n${body}\nendstream endobj`
    ];
    const header = "%PDF-1.4\n";
    let offset = header.length;
    const xref = ["0000000000 65535 f "];
    const content = objects.map((object) => {
      xref.push(String(offset).padStart(10, "0") + " 00000 n ");
      offset += object.length + 1;
      return object;
    }).join("\n");
    const tableAt = header.length + content.length + 1;
    const pdf = `${header}${content}\nxref\n0 ${objects.length + 1}\n${xref.join("\n")}\ntrailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${tableAt}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
  }

  function svgForQuote(quote) {
    const rows = getItems(quote.quote_id).map((item, index) => `
      <text x="70" y="${510 + index * 44}" font-size="24" fill="#0f172a">${esc(item.category)}｜${esc(item.item_name)}</text>
      <text x="900" y="${510 + index * 44}" font-size="24" fill="#0f172a">${money(Number(item.unit_price || 0) * Number(item.qty || 1))}</text>
    `).join("");
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600">
        <rect width="1200" height="1600" fill="#f7fbff"/>
        <rect x="48" y="48" width="1104" height="1504" rx="34" fill="#ffffff" stroke="#d8e8f7"/>
        <circle cx="135" cy="138" r="48" fill="#1684e5"/>
        <text x="116" y="154" font-size="40" font-weight="700" fill="#fff">汽</text>
        <text x="210" y="130" font-size="42" font-weight="800" fill="#0f172a">${esc(quote.store_name)}</text>
        <text x="210" y="178" font-size="24" fill="#64748b">報價單 ${esc(quote.quote_id)}</text>
        <rect x="70" y="250" width="1060" height="180" rx="24" fill="#eef7ff"/>
        <text x="105" y="308" font-size="28" fill="#0f172a">車主：${esc(quote.customer_name)}　電話：${esc(quote.phone)}</text>
        <text x="105" y="362" font-size="28" fill="#0f172a">車牌：${esc(quote.plate)}　車型：${esc(quote.car_model)}　年份：${esc(quote.car_year)}</text>
        <text x="70" y="475" font-size="32" font-weight="800" fill="#1684e5">服務明細</text>
        ${rows}
        <rect x="70" y="1060" width="1060" height="260" rx="24" fill="#f8fafc"/>
        <text x="105" y="1125" font-size="28" fill="#0f172a">基礎套餐合計：${money(quote.package_total)}</text>
        <text x="105" y="1178" font-size="28" fill="#0f172a">加購項目合計：${money(quote.addon_total)}</text>
        <text x="105" y="1231" font-size="28" fill="#0f172a">優惠折扣：-${money(quote.discount_amount)}</text>
        <text x="105" y="1292" font-size="38" font-weight="900" fill="#1684e5">最終應付：${money(total(quote))}</text>
        <text x="70" y="1405" font-size="22" fill="#64748b">轎車車型以上或車輛過髒等會另外酌收清潔費</text>
        <text x="70" y="1485" font-size="24" fill="#0f172a">門店確認簽名：________________　客戶確認簽名：________________</text>
      </svg>
    `;
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(link.href);
      link.remove();
    }, 1000);
  }

  function exportPdf(quoteId) {
    const quote = getQuote(quoteId);
    if (!quote) return alert("找不到報價單");
    if (!canExport()) return alert("目前角色沒有匯出報價單權限");
    if (quote.status === QUOTE_STATUS.VOID) return alert("已作廢報價單禁止匯出");
    downloadBlob(makePdfBlob(textForPdf(quote)), `報價單_${quote.quote_id}_${quote.plate}.pdf`);
    quote.pdf_file_path = `local-cache/quotes/${quote.quote_id}.pdf`;
    save();
  }

  function exportImage(quoteId) {
    const quote = getQuote(quoteId);
    if (!quote) return alert("找不到報價單");
    if (!canExport()) return alert("目前角色沒有匯出報價單權限");
    if (quote.status === QUOTE_STATUS.VOID) return alert("已作廢報價單禁止匯出");

    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgForQuote(quote)], { type: "image/svg+xml;charset=utf-8" }));
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1600;
      canvas.getContext("2d").drawImage(img, 0, 0);
      canvas.toBlob((blob) => downloadBlob(blob, `報價單_${quote.quote_id}_${quote.plate}.png`), "image/png");
      URL.revokeObjectURL(url);
      quote.img_file_path = `local-cache/quotes/${quote.quote_id}.png`;
      save();
    };
    img.onerror = () => alert("圖片匯出失敗，請重新整理後再試一次");
    img.src = url;
  }

  function convertToWorkOrder(quoteId) {
    const data = db();
    const quote = getQuote(quoteId);
    if (!quote) return alert("找不到報價單");
    quote.status = QUOTE_STATUS.CONVERTED;
    data.quoteWorkOrders.push({
      work_order_id: `WO${Date.now()}`,
      bind_quote_id: quote.quote_id,
      customer_name: quote.customer_name,
      plate: quote.plate,
      store_name: quote.store_name,
      status: "待施工",
      created_at: new Date().toISOString()
    });
    save();
    alert("已轉成工單，可從工單追溯原始報價單。");
    quoteListPage();
  }

  function setMain(title, html) {
    const app = document.getElementById("app") || document.body;
    app.innerHTML = `
      <div class="quote-export-page">
        <header class="topbar"><div class="brand"><div class="logo">汽</div><div><h1>${title}</h1><small>報價匯出與工單追溯</small></div></div><button class="ghost-btn" onclick="history.back()">返回上一頁</button></header>
        ${html}
      </div>
    `;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function quoteListPage() {
    const rows = db().quoteEstimates.map((quote) => `
      <tr>
        <td>${esc(quote.quote_id)}</td>
        <td>${esc(quote.customer_name)}<br><small>${esc(quote.phone)}</small></td>
        <td>${esc(quote.plate)}<br><small>${esc(quote.car_model)}</small></td>
        <td>${esc(quote.store_name)}</td>
        <td>${money(total(quote))}</td>
        <td><span class="quote-status">${esc(quote.status)}</span></td>
        <td class="quote-row-actions">
          <button data-quote-detail="${esc(quote.quote_id)}">詳情</button>
          ${canExport() ? `<button data-quote-pdf="${esc(quote.quote_id)}">下載PDF報價單</button><button data-quote-img="${esc(quote.quote_id)}">匯出圖片傳送客戶</button>` : ""}
          <button data-quote-convert="${esc(quote.quote_id)}">轉工單</button>
        </td>
      </tr>
    `).join("");
    setMain("報價單管理", `
      <section class="glass-card table-wrap">
        <table><thead><tr><th>報價單</th><th>客戶</th><th>車輛</th><th>門市</th><th>金額</th><th>狀態</th><th>操作</th></tr></thead><tbody>${rows}</tbody></table>
      </section>
    `);
  }

  function quoteDetailPage(quoteId) {
    const quote = getQuote(quoteId);
    if (!quote) return alert("找不到報價單");
    setMain("報價單詳情", `
      <div class="quote-actions">
        <button data-quote-list>回列表</button>
        ${canExport() ? `<button data-quote-pdf="${esc(quote.quote_id)}">下載PDF報價單</button><button data-quote-img="${esc(quote.quote_id)}">匯出圖片傳送客戶</button>` : ""}
        <button data-quote-convert="${esc(quote.quote_id)}">轉工單</button>
      </div>
      ${quoteHtml(quote)}
    `);
  }

  function quoteWorkOrderPage() {
    const rows = db().quoteWorkOrders.map((order) => `
      <tr>
        <td>${esc(order.work_order_id)}</td>
        <td>${esc(order.customer_name)}</td>
        <td>${esc(order.plate)}</td>
        <td>${esc(order.status)}</td>
        <td><button data-quote-detail="${esc(order.bind_quote_id)}">查看原始報價單</button></td>
      </tr>
    `).join("") || `<tr><td colspan="5">尚無報價轉工單紀錄。</td></tr>`;
    setMain("工單追溯", `
      <section class="glass-card table-wrap">
        <table><thead><tr><th>工單</th><th>客戶</th><th>車牌</th><th>狀態</th><th>原始報價</th></tr></thead><tbody>${rows}</tbody></table>
      </section>
    `);
  }

  function addEntrances() {
    const cards = document.querySelectorAll(".module-card, .portal-card, .tool-card");
    const operationCard = [...cards].find((card) => card.textContent.includes("營運管理") || card.textContent.includes("訂單"));
    if (!operationCard || operationCard.dataset.quoteInjected) return;
    operationCard.dataset.quoteInjected = "1";
    const box = operationCard.querySelector(".module-card-actions, .portal-actions, .quick-actions") || operationCard;
    box.insertAdjacentHTML("beforeend", `
      <button class="quote-entry-btn" data-quote-page>報價單匯出</button>
      <button class="quote-entry-btn" data-quote-workorders>工單追溯</button>
    `);
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    if (target.dataset.quotePage !== undefined) quoteListPage();
    if (target.dataset.quoteWorkorders !== undefined) quoteWorkOrderPage();
    if (target.dataset.quoteList !== undefined) quoteListPage();
    if (target.dataset.quoteDetail) quoteDetailPage(target.dataset.quoteDetail);
    if (target.dataset.quotePdf) exportPdf(target.dataset.quotePdf);
    if (target.dataset.quoteImg) exportImage(target.dataset.quoteImg);
    if (target.dataset.quoteConvert) convertToWorkOrder(target.dataset.quoteConvert);
  });

  window.quoteExportModule = { quoteListPage, quoteDetailPage, quoteWorkOrderPage, exportPdf, exportImage };
  document.addEventListener("DOMContentLoaded", () => setTimeout(addEntrances, 300));
  document.addEventListener("ui:stabilize", () => setTimeout(addEntrances, 300));
})();
