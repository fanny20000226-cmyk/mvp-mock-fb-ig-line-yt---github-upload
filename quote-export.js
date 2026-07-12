(() => {
  var KEY = "beauty-crm-v10";
  var T = {
    quoteList: "\u5831\u50f9\u55ae\u532f\u51fa",
    workTrace: "\u5de5\u55ae\u8ffd\u6eaf",
    makeQuote: "\u88fd\u4f5c\u5831\u50f9\u55ae",
    quoteBuilder: "\u5831\u50f9\u4ecb\u9762",
    createQuote: "\u5efa\u7acb\u5831\u50f9\u55ae",
    completionDoc: "\u7522\u51fa\u65bd\u5de5\u55ae",
    markDone: "\u6a19\u8a18\u5b8c\u5de5",
    detail: "\u8a73\u60c5",
    pdf: "\u4e0b\u8f09PDF\u5831\u50f9\u55ae",
    image: "\u532f\u51fa\u5716\u7247\u50b3\u9001\u5ba2\u6236",
    convert: "\u8f49\u5de5\u55ae",
    sourceQuote: "\u67e5\u770b\u539f\u59cb\u5831\u50f9\u55ae",
    back: "\u8fd4\u56de\u4e0a\u4e00\u9801",
    listBack: "\u56de\u5217\u8868",
    noQuote: "\u627e\u4e0d\u5230\u5831\u50f9\u55ae",
    noPermission: "\u76ee\u524d\u89d2\u8272\u6c92\u6709\u532f\u51fa\u5831\u50f9\u55ae\u6b0a\u9650",
    voidBlocked: "\u5df2\u4f5c\u5ee2\u5831\u50f9\u55ae\u7981\u6b62\u532f\u51fa",
    doneWork: "\u5df2\u8f49\u6210\u5de5\u55ae\uff0c\u53ef\u5f9e\u5de5\u55ae\u8ffd\u6eaf\u539f\u59cb\u5831\u50f9\u55ae\u3002",
    store: "\u4e09\u91cd\u6c7d\u8eca\u7f8e\u5bb9",
    carLogo: "\u6c7d",
    statusDraft: "\u5f85\u78ba\u8a8d",
    statusConverted: "\u5df2\u8f49\u5de5\u55ae",
    statusDone: "\u65bd\u5de5\u5b8c\u6210",
    customer: "\u5ba2\u6236",
    vehicle: "\u8eca\u8f1b",
    amount: "\u91d1\u984d",
    status: "\u72c0\u614b",
    action: "\u64cd\u4f5c",
    quoteNo: "\u5831\u50f9\u55ae",
    serviceItems: "\u670d\u52d9\u660e\u7d30",
    packageTotal: "\u57fa\u790e\u5957\u9910\u5408\u8a08",
    addonTotal: "\u52a0\u8cfc\u9805\u76ee\u5408\u8a08",
    discount: "\u512a\u60e0\u6298\u6263",
    payable: "\u6700\u7d42\u61c9\u4ed8\u7e3d\u50f9",
    deposit: "\u5df2\u6536\u8a02\u91d1",
    note: "\u5099\u8a3b",
    footer: "\u8f4e\u8eca\u8eca\u578b\u4ee5\u4e0a\u6216\u8eca\u8f1b\u904e\u9ad2\u7b49\u6703\u53e6\u5916\u914c\u6536\u6e05\u6f54\u8cbb",
    storeSign: "\u9580\u5e97\u78ba\u8a8d\u7c3d\u540d",
    customerSign: "\u5ba2\u6236\u78ba\u8a8d\u7c3d\u540d"
  };

  function readDb() {
    var data = window.db || JSON.parse(localStorage.getItem(KEY) || "{}");
    if (!data.quoteEstimates) data.quoteEstimates = seedQuotes(data);
    if (!data.quoteEstimateItems) data.quoteEstimateItems = seedItems(data.quoteEstimates);
    if (!data.quoteWorkOrders) data.quoteWorkOrders = [];
    window.db = data;
    return data;
  }

  function saveDb() {
    localStorage.setItem(KEY, JSON.stringify(readDb()));
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char];
    });
  }

  function money(value) {
    return "$" + Number(value || 0).toLocaleString("zh-TW");
  }

  function seedQuotes(data) {
    var order = (data.orders || [])[0] || {};
    var store = order.store || "\u4e09\u91cd";
    return [{
      quote_id: "Q20260709001",
      store_code: store,
      store_name: store + "\u6c7d\u8eca\u7f8e\u5bb9",
      customer_name: order.name || "\u738b\u5148\u751f",
      phone: order.phone || "0911222333",
      plate: order.plate || "ABC-1234",
      car_model: order.car || "Tesla Model Y",
      car_year: "2024",
      package_total: 1500,
      addon_total: 1800,
      discount_amount: 300,
      deposit_amount: 500,
      appointment_date: order.date || "2026-07-10 10:00",
      remark: "\u7bc4\u4f8b\u5831\u50f9\u55ae\uff0c\u53ef\u4e0b\u8f09 PDF \u6216\u532f\u51fa\u5716\u7247\u7d66\u5ba2\u6236\u78ba\u8a8d\u3002",
      status: T.statusDraft,
      created_by: "admin",
      created_at: new Date().toISOString(),
      pdf_file_path: "",
      img_file_path: ""
    }];
  }

  function seedItems(quotes) {
    var quoteId = quotes && quotes[0] ? quotes[0].quote_id : "Q20260709001";
    return [
      { quote_id: quoteId, category: "\u6574\u65b0\u5957\u9910", item_name: "9999 \u5167\u5916\u8d85\u503c\u6574\u65b0", unit_price: 1500, qty: 1 },
      { quote_id: quoteId, category: "\u73bb\u7483\u7cfb\u5217", item_name: "\u73bb\u7483\u6cb9\u819c\u8655\u7406", unit_price: 800, qty: 1 },
      { quote_id: quoteId, category: "\u5167\u88dd\u7cfb\u5217", item_name: "\u5bf5\u7269\u7570\u5473\u52a0\u5f37", unit_price: 1000, qty: 1 },
      { quote_id: quoteId, category: "\u8d08\u54c1", item_name: "\u96e8\u5b63\u73bb\u7483\u6aa2\u67e5", unit_price: 0, qty: 1 }
    ];
  }

  function getQuote(id) {
    return readDb().quoteEstimates.filter(function (q) { return q.quote_id === id; })[0];
  }

  function getItems(id) {
    return readDb().quoteEstimateItems.filter(function (item) { return item.quote_id === id; });
  }

  function canExport() {
    var role = readDb().currentRole || readDb().role || "SUPER_ADMIN";
    return ["TECHNICIAN", "EMPLOYEE", "\u6280\u5e2b"].indexOf(role) === -1;
  }

  function total(q) {
    return Number(q.package_total || 0) + Number(q.addon_total || 0) - Number(q.discount_amount || 0);
  }

  function quotePaper(q) {
    var rows = getItems(q.quote_id).map(function (item) {
      return "<tr><td>" + esc(item.category) + "</td><td>" + esc(item.item_name) + "</td><td>" + money(item.unit_price) + "</td><td>" + esc(item.qty || 1) + "</td><td>" + money(Number(item.unit_price || 0) * Number(item.qty || 1)) + "</td></tr>";
    }).join("");
    return "<article class=\"quote-paper\">" +
      "<header class=\"quote-header\"><div class=\"quote-logo\">" + T.carLogo + "</div><div><h2>" + esc(q.store_name) + "</h2><p>" + T.quoteNo + "\uff1a" + esc(q.quote_id) + " / " + new Date(q.created_at).toLocaleString("zh-TW") + "</p></div></header>" +
      "<div class=\"quote-info\"><span>\u8eca\u4e3b\uff1a" + esc(q.customer_name) + "</span><span>\u96fb\u8a71\uff1a" + esc(q.phone) + "</span><span>\u8eca\u724c\uff1a" + esc(q.plate) + "</span><span>\u8eca\u578b\uff1a" + esc(q.car_model) + "</span><span>\u5e74\u4efd\uff1a" + esc(q.car_year) + "</span><span>\u9810\u7d04\uff1a" + esc(q.appointment_date) + "</span></div>" +
      "<section class=\"quote-section\"><h3>" + T.serviceItems + "</h3><table><thead><tr><th>\u5206\u985e</th><th>\u9805\u76ee</th><th>\u55ae\u50f9</th><th>\u6578\u91cf</th><th>\u5c0f\u8a08</th></tr></thead><tbody>" + rows + "</tbody></table></section>" +
      "<section class=\"quote-total\"><p>" + T.packageTotal + "<b>" + money(q.package_total) + "</b></p><p>" + T.addonTotal + "<b>" + money(q.addon_total) + "</b></p><p>" + T.discount + "<b>-" + money(q.discount_amount) + "</b></p><p class=\"quote-payable\">" + T.payable + "<b>" + money(total(q)) + "</b></p><p>" + T.deposit + "<b>" + money(q.deposit_amount) + "</b></p></section>" +
      "<p class=\"quote-note\">" + T.note + "\uff1a" + esc(q.remark || T.footer) + "</p><footer class=\"quote-sign\"><span>" + T.storeSign + "\uff1a________________</span><span>" + T.customerSign + "\uff1a________________</span></footer></article>";
  }

  function textForPdf(q) {
    var lines = [q.store_name + " " + T.quoteNo, T.quoteNo + "\uff1a" + q.quote_id, "\u8eca\u4e3b\uff1a" + q.customer_name, "\u96fb\u8a71\uff1a" + q.phone, "\u8eca\u724c\uff1a" + q.plate, "\u8eca\u578b\uff1a" + q.car_model, ""];
    getItems(q.quote_id).forEach(function (item) { lines.push(item.category + " / " + item.item_name + " / " + money(item.unit_price)); });
    lines.push("", T.payable + "\uff1a" + money(total(q)), T.deposit + "\uff1a" + money(q.deposit_amount), T.footer);
    return lines.join("\n");
  }

  function makePdfBlob(text) {
    var safe = text.replace(/[^\x20-\x7E\n]/g, "?").split("\n");
    var body = safe.map(function (line, index) {
      return "BT /F1 12 Tf 50 " + (760 - index * 18) + " Td (" + line.replace(/[()\\]/g, "\\$&") + ") Tj ET";
    }).join("\n");
    var objects = [
      "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
      "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
      "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
      "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
      "5 0 obj << /Length " + body.length + " >> stream\n" + body + "\nendstream endobj"
    ];
    var header = "%PDF-1.4\n";
    var offset = header.length;
    var xref = ["0000000000 65535 f "];
    var content = objects.map(function (object) {
      xref.push(String(offset).padStart(10, "0") + " 00000 n ");
      offset += object.length + 1;
      return object;
    }).join("\n");
    var tableAt = header.length + content.length + 1;
    var pdf = header + content + "\nxref\n0 " + (objects.length + 1) + "\n" + xref.join("\n") + "\ntrailer << /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + tableAt + "\n%%EOF";
    return new Blob([pdf], { type: "application/pdf" });
  }

  function downloadBlob(blob, filename) {
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
  }

  function svgForQuote(q) {
    var rows = getItems(q.quote_id).map(function (item, i) {
      return "<text x=\"70\" y=\"" + (510 + i * 44) + "\" font-size=\"24\" fill=\"#0f172a\">" + esc(item.category + " | " + item.item_name) + "</text><text x=\"900\" y=\"" + (510 + i * 44) + "\" font-size=\"24\" fill=\"#0f172a\">" + money(item.unit_price) + "</text>";
    }).join("");
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1200\" height=\"1600\"><rect width=\"1200\" height=\"1600\" fill=\"#f7fbff\"/><rect x=\"48\" y=\"48\" width=\"1104\" height=\"1504\" rx=\"34\" fill=\"#fff\" stroke=\"#d8e8f7\"/><circle cx=\"135\" cy=\"138\" r=\"48\" fill=\"#1684e5\"/><text x=\"116\" y=\"154\" font-size=\"40\" font-weight=\"700\" fill=\"#fff\">" + T.carLogo + "</text><text x=\"210\" y=\"130\" font-size=\"42\" font-weight=\"800\" fill=\"#0f172a\">" + esc(q.store_name) + "</text><text x=\"210\" y=\"178\" font-size=\"24\" fill=\"#64748b\">" + esc(q.quote_id) + "</text><rect x=\"70\" y=\"250\" width=\"1060\" height=\"180\" rx=\"24\" fill=\"#eef7ff\"/><text x=\"105\" y=\"318\" font-size=\"28\" fill=\"#0f172a\">" + esc(q.customer_name + " / " + q.phone) + "</text><text x=\"105\" y=\"372\" font-size=\"28\" fill=\"#0f172a\">" + esc(q.plate + " / " + q.car_model) + "</text><text x=\"70\" y=\"475\" font-size=\"32\" font-weight=\"800\" fill=\"#1684e5\">" + T.serviceItems + "</text>" + rows + "<rect x=\"70\" y=\"1060\" width=\"1060\" height=\"260\" rx=\"24\" fill=\"#f8fafc\"/><text x=\"105\" y=\"1130\" font-size=\"30\" fill=\"#0f172a\">" + T.packageTotal + "\uff1a" + money(q.package_total) + "</text><text x=\"105\" y=\"1190\" font-size=\"30\" fill=\"#0f172a\">" + T.addonTotal + "\uff1a" + money(q.addon_total) + "</text><text x=\"105\" y=\"1270\" font-size=\"40\" font-weight=\"900\" fill=\"#1684e5\">" + T.payable + "\uff1a" + money(total(q)) + "</text><text x=\"70\" y=\"1420\" font-size=\"22\" fill=\"#64748b\">" + T.footer + "</text></svg>";
  }

  function exportPdf(id) {
    var q = getQuote(id);
    if (!q) return alert(T.noQuote);
    if (!canExport()) return alert(T.noPermission);
    downloadBlob(makePdfBlob(textForPdf(q)), "quote_" + q.quote_id + "_" + q.plate + ".pdf");
    q.pdf_file_path = "local-cache/quotes/" + q.quote_id + ".pdf";
    saveDb();
  }

  function exportImage(id) {
    var q = getQuote(id);
    if (!q) return alert(T.noQuote);
    if (!canExport()) return alert(T.noPermission);
    var img = new Image();
    var url = URL.createObjectURL(new Blob([svgForQuote(q)], { type: "image/svg+xml;charset=utf-8" }));
    img.onload = function () {
      var canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1600;
      canvas.getContext("2d").drawImage(img, 0, 0);
      canvas.toBlob(function (blob) { downloadBlob(blob, "quote_" + q.quote_id + "_" + q.plate + ".png"); }, "image/png");
      URL.revokeObjectURL(url);
      q.img_file_path = "local-cache/quotes/" + q.quote_id + ".png";
      saveDb();
    };
    img.src = url;
  }

  function setMain(title, html) {
    var app = document.getElementById("app");
    if (!app) return;
    app.innerHTML = "<div class=\"quote-export-page\"><header class=\"topbar\"><div class=\"brand\"><div class=\"logo\">" + T.carLogo + "</div><div><h1>" + title + "</h1><small>\u5831\u50f9\u532f\u51fa\u8207\u5de5\u55ae\u8ffd\u6eaf</small></div></div><button class=\"ghost-btn\" data-quote-back>" + T.back + "</button></header>" + html + "</div>";
    window.scrollTo(0, 0);
  }

  function quoteListPage() {
    var rows = readDb().quoteEstimates.map(function (q) {
      return "<tr><td>" + esc(q.quote_id) + "</td><td>" + esc(q.customer_name) + "<br><small>" + esc(q.phone) + "</small></td><td>" + esc(q.plate) + "<br><small>" + esc(q.car_model) + "</small></td><td>" + esc(q.store_name) + "</td><td>" + money(total(q)) + "</td><td><span class=\"quote-status\">" + esc(q.status) + "</span></td><td class=\"quote-row-actions\"><button data-quote-detail=\"" + esc(q.quote_id) + "\">" + T.detail + "</button><button data-quote-pdf=\"" + esc(q.quote_id) + "\">" + T.pdf + "</button><button data-quote-img=\"" + esc(q.quote_id) + "\">" + T.image + "</button><button data-quote-convert=\"" + esc(q.quote_id) + "\">" + T.convert + "</button></td></tr>";
    }).join("");
    setMain(T.quoteList, "<section class=\"glass-card table-wrap\"><table><thead><tr><th>" + T.quoteNo + "</th><th>" + T.customer + "</th><th>" + T.vehicle + "</th><th>\u9580\u5e97</th><th>" + T.amount + "</th><th>" + T.status + "</th><th>" + T.action + "</th></tr></thead><tbody>" + rows + "</tbody></table></section>");
  }

  function quoteDetailPage(id) {
    var q = getQuote(id);
    if (!q) return alert(T.noQuote);
    setMain(T.detail, "<div class=\"quote-actions\"><button data-quote-list>" + T.listBack + "</button><button data-quote-pdf=\"" + esc(q.quote_id) + "\">" + T.pdf + "</button><button data-quote-img=\"" + esc(q.quote_id) + "\">" + T.image + "</button><button data-quote-convert=\"" + esc(q.quote_id) + "\">" + T.convert + "</button></div>" + quotePaper(q));
  }

  function convertToWorkOrder(id) {
    var data = readDb();
    var q = getQuote(id);
    if (!q) return alert(T.noQuote);
    q.status = T.statusConverted;
    data.quoteWorkOrders.push({ work_order_id: "WO" + Date.now(), bind_quote_id: q.quote_id, customer_name: q.customer_name, plate: q.plate, status: "\u5f85\u65bd\u5de5" });
    saveDb();
    alert(T.doneWork);
    quoteListPage();
  }

  function latestOrderLike() {
    var data = readDb();
    var orders = data.orders || data.reservations || [];
    return orders.length ? orders[orders.length - 1] : {};
  }

  function quoteServiceOptions() {
    return [
      { id: "pkg9999", category: "\u6574\u65b0\u5957\u9910", name: "9999 \u5167\u5916\u8d85\u503c", price: 9999 },
      { id: "deepclean", category: "\u5167\u88dd\u5957\u9910", name: "\u5167\u88dd\u6df1\u5c64\u62c6\u6d17", price: 6800 },
      { id: "coating", category: "\u934d\u819c\u5957\u9910", name: "\u5916\u89c0\u934d\u819c", price: 12800 },
      { id: "glass", category: "\u73bb\u7483\u7cfb\u5217", name: "\u73bb\u7483\u6cb9\u819c\u934d\u819c", price: 1800 },
      { id: "chassis", category: "\u5176\u4ed6\u7cfb\u5217", name: "\u5e95\u76e4\u6e05\u6d17", price: 2200 },
      { id: "smoke", category: "\u5167\u88dd\u52a0\u8cfc", name: "\u7159\u5473\u8655\u7406", price: 1500 },
      { id: "mold", category: "\u5167\u88dd\u52a0\u8cfc", name: "\u767c\u9709\u8655\u7406", price: 2500 },
      { id: "pet", category: "\u5167\u88dd\u52a0\u8cfc", name: "\u5bf5\u7269\u7570\u5473", price: 1800 }
    ];
  }

  function quoteBuilderPage() {
    var base = latestOrderLike();
    var serviceCards = quoteServiceOptions().map(function (item) {
      return "<label class=\"quote-service-option\"><input type=\"checkbox\" data-quote-service value=\"" + esc(item.id) + "\" data-price=\"" + esc(item.price) + "\" data-name=\"" + esc(item.name) + "\" data-category=\"" + esc(item.category) + "\"><span><b>" + esc(item.name) + "</b><small>" + esc(item.category) + "</small></span><strong>" + money(item.price) + "</strong></label>";
    }).join("");
    setMain(T.quoteBuilder, "<main class=\"quote-builder-grid\"><section class=\"glass-card quote-form-card\"><h2>\u5ba2\u6236\u8207\u8eca\u8f1b\u8cc7\u6599</h2><div class=\"quote-form-grid\">" +
      quoteField("qbName", "\u7a31\u547c", base.name || base.customer_name || "") +
      quoteField("qbPhone", "\u806f\u7d61\u96fb\u8a71", base.phone || "") +
      quoteField("qbPlate", "\u8eca\u724c", base.plate || "") +
      quoteField("qbCar", "\u8eca\u578b", base.car || base.carModel || base.model || "") +
      quoteField("qbYear", "\u5e74\u4efd", base.year || base.carYear || "") +
      quoteField("qbStore", "\u9580\u5e02", base.store || base.branch || "\u4e09\u91cd") +
      quoteField("qbDate", "\u9810\u7d04\u65e5\u671f / \u6642\u9593", base.date || base.appointmentDate || "") +
      quoteField("qbDeposit", "\u5df2\u6536\u8a02\u91d1", base.deposit || "0", "number") +
      quoteField("qbDiscount", "\u512a\u60e0\u6298\u6263", "0", "number") +
      "<label class=\"quote-field quote-field-wide\"><span>\u5099\u8a3b</span><textarea id=\"qbNote\" rows=\"4\">" + esc(base.note || "") + "</textarea></label></div></section>" +
      "<section class=\"glass-card quote-form-card\"><h2>\u9078\u64c7\u5957\u9910 / \u52a0\u8cfc</h2><div class=\"quote-service-list\">" + serviceCards + "</div><div class=\"quote-custom-line\"><input id=\"qbCustomName\" placeholder=\"\u81ea\u8a02\u9805\u76ee\u540d\u7a31\"><input id=\"qbCustomPrice\" type=\"number\" placeholder=\"\u91d1\u984d\"><button data-add-custom-quote-item>\u52a0\u5165\u81ea\u8a02\u9805\u76ee</button></div><div id=\"qbCustomItems\" class=\"quote-custom-items\"></div><aside class=\"quote-live-total\"><p>\u5957\u9910/\u52a0\u8cfc\u5408\u8a08 <b id=\"qbSubtotal\">$0</b></p><p>\u512a\u60e0\u6298\u6263 <b id=\"qbDiscountView\">-$0</b></p><p class=\"quote-payable\">\u6700\u7d42\u5831\u50f9 <b id=\"qbFinal\">$0</b></p><button data-create-quote-from-builder>" + T.createQuote + "</button></aside></section></main>");
    refreshBuilderTotal();
  }

  function quoteField(id, label, value, type) {
    return "<label class=\"quote-field\"><span>" + label + "</span><input id=\"" + id + "\" type=\"" + (type || "text") + "\" value=\"" + esc(value || "") + "\"></label>";
  }

  function builderValue(id) {
    var node = document.getElementById(id);
    return node ? node.value.trim() : "";
  }

  function selectedBuilderItems() {
    var items = Array.prototype.slice.call(document.querySelectorAll("[data-quote-service]:checked")).map(function (input) {
      return {
        category: input.getAttribute("data-category") || "\u5176\u4ed6",
        item_name: input.getAttribute("data-name") || "",
        unit_price: Number(input.getAttribute("data-price") || 0),
        qty: 1
      };
    });
    Array.prototype.slice.call(document.querySelectorAll("[data-custom-quote-item]")).forEach(function (node) {
      items.push({
        category: "\u81ea\u8a02\u9805\u76ee",
        item_name: node.getAttribute("data-name") || "",
        unit_price: Number(node.getAttribute("data-price") || 0),
        qty: 1
      });
    });
    return items;
  }

  function refreshBuilderTotal() {
    var subtotal = selectedBuilderItems().reduce(function (sum, item) { return sum + Number(item.unit_price || 0); }, 0);
    var discount = Number(builderValue("qbDiscount") || 0);
    var subtotalNode = document.getElementById("qbSubtotal");
    var discountNode = document.getElementById("qbDiscountView");
    var finalNode = document.getElementById("qbFinal");
    if (subtotalNode) subtotalNode.textContent = money(subtotal);
    if (discountNode) discountNode.textContent = "-" + money(discount);
    if (finalNode) finalNode.textContent = money(Math.max(0, subtotal - discount));
  }

  function addCustomBuilderItem() {
    var name = builderValue("qbCustomName");
    var price = Number(builderValue("qbCustomPrice") || 0);
    if (!name || !price) return alert("\u8acb\u586b\u5beb\u81ea\u8a02\u9805\u76ee\u540d\u7a31\u8207\u91d1\u984d");
    var box = document.getElementById("qbCustomItems");
    if (!box) return;
    box.insertAdjacentHTML("beforeend", "<span class=\"quote-custom-pill\" data-custom-quote-item data-name=\"" + esc(name) + "\" data-price=\"" + esc(price) + "\">" + esc(name) + " " + money(price) + "<button data-remove-custom-quote-item>\u00d7</button></span>");
    document.getElementById("qbCustomName").value = "";
    document.getElementById("qbCustomPrice").value = "";
    refreshBuilderTotal();
  }

  function createQuoteFromBuilder() {
    var data = readDb();
    var quoteId = "Q" + Date.now();
    var items = selectedBuilderItems();
    if (!builderValue("qbName") || !builderValue("qbPhone") || !builderValue("qbPlate")) return alert("\u8acb\u81f3\u5c11\u586b\u5beb\u7a31\u547c\u3001\u96fb\u8a71\u3001\u8eca\u724c");
    if (!items.length) return alert("\u8acb\u81f3\u5c11\u9078\u64c7\u4e00\u500b\u5957\u9910\u6216\u52a0\u8cfc\u9805\u76ee");
    var packageTotal = items.reduce(function (sum, item) { return sum + Number(item.unit_price || 0); }, 0);
    var discount = Number(builderValue("qbDiscount") || 0);
    var quote = {
      quote_id: quoteId,
      store_code: builderValue("qbStore") || "\u4e09\u91cd",
      store_name: (builderValue("qbStore") || "\u4e09\u91cd") + "\u6c7d\u8eca\u7f8e\u5bb9",
      customer_name: builderValue("qbName"),
      phone: builderValue("qbPhone"),
      plate: builderValue("qbPlate"),
      car_model: builderValue("qbCar"),
      car_year: builderValue("qbYear"),
      package_total: packageTotal,
      addon_total: 0,
      discount_amount: discount,
      deposit_amount: Number(builderValue("qbDeposit") || 0),
      appointment_date: builderValue("qbDate"),
      remark: builderValue("qbNote") || T.footer,
      status: "\u5f85\u5ba2\u6236\u78ba\u8a8d",
      created_by: "front",
      created_at: new Date().toISOString(),
      pdf_file_path: "",
      img_file_path: ""
    };
    data.quoteEstimates.push(quote);
    items.forEach(function (item) {
      data.quoteEstimateItems.push({
        quote_id: quoteId,
        category: item.category,
        item_name: item.item_name,
        unit_price: item.unit_price,
        qty: item.qty || 1
      });
    });
    saveDb();
    quoteCreatedModal(quoteId);
  }

  function quoteCreatedModal(id) {
    var q = getQuote(id);
    if (!q) return;
    var old = document.querySelector("[data-quote-created-modal]");
    if (old) old.remove();
    document.body.insertAdjacentHTML("beforeend", "<div class=\"quote-modal\" data-quote-created-modal><div class=\"quote-modal-card\"><h2>" + T.makeQuote + "</h2><p>" + T.quoteNo + "\uff1a" + esc(id) + "</p><button data-quote-pdf=\"" + esc(id) + "\">" + T.pdf + "</button><button data-quote-img=\"" + esc(id) + "\">" + T.image + "</button><button data-quote-detail=\"" + esc(id) + "\">" + T.detail + "</button><button data-quote-modal-close>\u95dc\u9589</button></div></div>");
  }

  function markWorkOrderDone(orderId) {
    var data = readDb();
    var order = data.quoteWorkOrders.filter(function (o) { return o.work_order_id === orderId; })[0];
    if (!order) return;
    order.status = T.statusDone;
    order.completed_at = new Date().toISOString();
    saveDb();
    workOrderPage();
  }

  function completionText(order) {
    var q = getQuote(order.bind_quote_id) || {};
    return [
      "\u8eca\u8f1b\u5b8c\u5de5\u78ba\u8a8d\u65bd\u5de5\u55ae",
      "\u5de5\u55ae\u7de8\u865f\uff1a" + order.work_order_id,
      "\u539f\u59cb\u5831\u50f9\uff1a" + (order.bind_quote_id || ""),
      "\u5ba2\u6236\uff1a" + (order.customer_name || q.customer_name || ""),
      "\u8eca\u724c\uff1a" + (order.plate || q.plate || ""),
      "\u5b8c\u5de5\u6642\u9593\uff1a" + (order.completed_at || new Date().toISOString()),
      "",
      "\u539f\u59cb\u5831\u50f9\u660e\u7d30",
      textForPdf(q),
      "",
      "\u65bd\u5de5\u5099\u8a3b\uff1a________________",
      "\u6280\u5e2b\u7c3d\u540d\uff1a________________",
      "\u5ba2\u6236\u53d6\u8eca\u7c3d\u540d\uff1a________________"
    ].join("\n");
  }

  function exportCompletionPdf(orderId) {
    var order = readDb().quoteWorkOrders.filter(function (o) { return o.work_order_id === orderId; })[0];
    if (!order) return alert("\u627e\u4e0d\u5230\u5de5\u55ae");
    if (order.status !== T.statusDone) return alert("\u5de5\u55ae\u5c1a\u672a\u5b8c\u5de5\uff0c\u4e0d\u80fd\u7522\u51fa\u65bd\u5de5\u55ae");
    downloadBlob(makePdfBlob(completionText(order)), "completion_" + order.work_order_id + "_" + order.plate + ".pdf");
    order.completion_file_path = "local-cache/workorders/" + order.work_order_id + ".pdf";
    saveDb();
  }

  function exportCompletionImage(orderId) {
    var order = readDb().quoteWorkOrders.filter(function (o) { return o.work_order_id === orderId; })[0];
    if (!order) return alert("\u627e\u4e0d\u5230\u5de5\u55ae");
    if (order.status !== T.statusDone) return alert("\u5de5\u55ae\u5c1a\u672a\u5b8c\u5de5\uff0c\u4e0d\u80fd\u7522\u51fa\u65bd\u5de5\u55ae");
    var q = getQuote(order.bind_quote_id) || {};
    var img = new Image();
    var svg = svgForQuote(q).replace(T.serviceItems, "\u8eca\u8f1b\u5b8c\u5de5\u78ba\u8a8d\u65bd\u5de5\u55ae");
    var url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    img.onload = function () {
      var canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1600;
      canvas.getContext("2d").drawImage(img, 0, 0);
      canvas.toBlob(function (blob) { downloadBlob(blob, "completion_" + order.work_order_id + "_" + order.plate + ".png"); }, "image/png");
      URL.revokeObjectURL(url);
      order.completion_img_path = "local-cache/workorders/" + order.work_order_id + ".png";
      saveDb();
    };
    img.src = url;
  }

  function workOrderPage() {
    var rows = readDb().quoteWorkOrders.map(function (o) {
      var doneButtons = o.status === T.statusDone ? "<button data-completion-pdf=\"" + esc(o.work_order_id) + "\">PDF</button><button data-completion-img=\"" + esc(o.work_order_id) + "\">PNG</button>" : "<button data-workorder-done=\"" + esc(o.work_order_id) + "\">" + T.markDone + "</button>";
      return "<tr><td>" + esc(o.work_order_id) + "</td><td>" + esc(o.customer_name) + "</td><td>" + esc(o.plate) + "</td><td>" + esc(o.status) + "</td><td class=\"quote-row-actions\"><button data-quote-detail=\"" + esc(o.bind_quote_id) + "\">" + T.sourceQuote + "</button>" + doneButtons + "</td></tr>";
    }).join("") || "<tr><td colspan=\"5\">\u5c1a\u7121\u5831\u50f9\u8f49\u5de5\u55ae\u7d00\u9304</td></tr>";
    setMain(T.workTrace, "<section class=\"glass-card table-wrap\"><table><thead><tr><th>\u5de5\u55ae</th><th>" + T.customer + "</th><th>\u8eca\u724c</th><th>" + T.status + "</th><th>" + T.quoteNo + "</th></tr></thead><tbody>" + rows + "</tbody></table></section>");
  }

  function addEntrances() {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".module-category-card, .module-card, .portal-card, .tool-card"));
    var target = cards.filter(function (card) { return /(\u904b\u71df|\u8a02\u55ae|\u7ba1\u7406\u7e3d\u89bd)/.test(card.textContent); })[0];
    if (!target || target.getAttribute("data-quote-injected")) return;
    target.setAttribute("data-quote-injected", "1");
    var box = target.querySelector(".module-card-actions, .module-category-body, .portal-actions, .quick-actions") || target;
    box.insertAdjacentHTML("beforeend", "<button class=\"quote-entry-btn\" data-quote-page>" + T.quoteList + "</button><button class=\"quote-entry-btn\" data-quote-workorders>" + T.workTrace + "</button>");
  }

  function addFrontQuoteButton() {
    if (!document.querySelector("[data-quote-floating-tools]")) {
      document.body.insertAdjacentHTML("beforeend", "<div class=\"quote-floating-tools\" data-quote-floating-tools><strong>\u5831\u50f9\u5de5\u5177</strong><button data-make-quote-front>" + T.makeQuote + "</button><button data-quote-page>" + T.quoteList + "</button><button data-quote-workorders>" + T.workTrace + "</button></div>");
    }
    if (document.querySelector("[data-inline-make-quote]")) return;
    var buttons = Array.prototype.slice.call(document.querySelectorAll("button, .tool-card, .portal-card"));
    var anchor = buttons.filter(function (node) { return /(\u8cbc\u4e0a\u586b\u55ae|\u9810\u7d04|\u50f9\u76ee)/.test(node.textContent); })[0];
    var container = anchor && (anchor.parentElement || anchor);
    if (!container) return;
    container.insertAdjacentHTML("beforeend", "<button class=\"quote-entry-btn\" data-inline-make-quote data-make-quote-front>" + T.makeQuote + "</button>");
  }

  document.addEventListener("click", function (event) {
    var b = event.target.closest && event.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-quote-page")) quoteListPage();
    if (b.hasAttribute("data-quote-workorders")) workOrderPage();
    if (b.hasAttribute("data-quote-list")) quoteListPage();
    if (b.hasAttribute("data-quote-back")) window.history.back();
    if (b.hasAttribute("data-quote-modal-close")) {
      var modal = document.querySelector("[data-quote-created-modal]");
      if (modal) modal.remove();
    }
    if (b.hasAttribute("data-make-quote-front")) quoteBuilderPage();
    if (b.hasAttribute("data-add-custom-quote-item")) addCustomBuilderItem();
    if (b.hasAttribute("data-remove-custom-quote-item")) {
      var custom = b.closest("[data-custom-quote-item]");
      if (custom) custom.remove();
      refreshBuilderTotal();
    }
    if (b.hasAttribute("data-create-quote-from-builder")) createQuoteFromBuilder();
    if (b.getAttribute("data-quote-detail")) quoteDetailPage(b.getAttribute("data-quote-detail"));
    if (b.getAttribute("data-quote-pdf")) exportPdf(b.getAttribute("data-quote-pdf"));
    if (b.getAttribute("data-quote-img")) exportImage(b.getAttribute("data-quote-img"));
    if (b.getAttribute("data-quote-convert")) convertToWorkOrder(b.getAttribute("data-quote-convert"));
    if (b.getAttribute("data-workorder-done")) markWorkOrderDone(b.getAttribute("data-workorder-done"));
    if (b.getAttribute("data-completion-pdf")) exportCompletionPdf(b.getAttribute("data-completion-pdf"));
    if (b.getAttribute("data-completion-img")) exportCompletionImage(b.getAttribute("data-completion-img"));
  });

  document.addEventListener("input", function (event) {
    if (event.target && (event.target.matches("[data-quote-service]") || event.target.id === "qbDiscount")) refreshBuilderTotal();
  });

  document.addEventListener("change", function (event) {
    if (event.target && event.target.matches("[data-quote-service]")) refreshBuilderTotal();
  });

  window.quoteExportModule = {
    quoteListPage: quoteListPage,
    quoteDetailPage: quoteDetailPage,
    workOrderPage: workOrderPage,
    quoteBuilderPage: quoteBuilderPage,
    exportPdf: exportPdf,
    exportImage: exportImage,
    createQuoteFromBuilder: createQuoteFromBuilder,
    exportCompletionPdf: exportCompletionPdf,
    exportCompletionImage: exportCompletionImage,
    addEntrances: addEntrances
  };

  document.addEventListener("DOMContentLoaded", function () { setTimeout(function () { addEntrances(); addFrontQuoteButton(); }, 300); });
  document.addEventListener("ui:stabilize", function () { setTimeout(function () { addEntrances(); addFrontQuoteButton(); }, 300); });
  setInterval(function () { addEntrances(); addFrontQuoteButton(); }, 1200);
})();
