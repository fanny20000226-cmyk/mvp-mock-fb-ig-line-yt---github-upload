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
    if (q.final_price !== undefined && q.final_price !== null && q.final_price !== "") return Number(q.final_price || 0);
    return Number(q.package_total || 0) + Number(q.addon_total || 0) - Number(q.discount_amount || 0);
  }

  var CAR_TYPES = [
    { id: "sedan5", name: "\u4e00\u822c\u8f4e\u8eca 5 \u4eba\u5ea7", seats: 5 },
    { id: "suv5", name: "\u5927\u578b\u4f11\u65c5 5 \u4eba\u5ea7", seats: 5 },
    { id: "mpv7", name: "\u4e03\u4eba\u5ea7 2-3-2", seats: 7 },
    { id: "van9", name: "\u4e5d\u4eba\u5ea7 / \u5546\u52d9\u8eca", seats: 9 }
  ];

  var CLEAN_ZONE_PRICE = {
    C1: 600, C2: 600, C3: 600, C4: 600,
    S1: 800, S2: 800, S3: 1200, S4: 900, S5: 900, S6: 900, S7: 900, S8: 900, S9: 900,
    M: 700, B: 900, O: 500, A1: 700, T1: 900, SP1: 500
  };

  var CLEAN_ZONE_NAMES = {
    C1: "\u99d5\u99db\u5ea7\u5730\u6bef", C2: "\u526f\u99d5\u5ea7\u5730\u6bef", C3: "\u5f8c\u6392\u5de6\u5074\u5730\u6bef", C4: "\u5f8c\u6392\u53f3\u5074\u5730\u6bef",
    S1: "\u99d5\u99db\u5ea7\u6905", S2: "\u526f\u99d5\u5ea7\u6905", S3: "\u5f8c\u6392\u5ea7\u6905", S4: "\u7b2c\u4e09\u6392\u5de6\u5ea7\u6905", S5: "\u7b2c\u4e09\u6392\u53f3\u5ea7\u6905",
    S6: "\u4e2d\u6392\u5de6\u5ea7\u6905", S7: "\u4e2d\u6392\u4e2d\u5ea7\u6905", S8: "\u4e2d\u6392\u53f3\u5ea7\u6905", S9: "\u6700\u5f8c\u6392\u5ea7\u6905",
    M: "\u4e2d\u592e\u901a\u9053", B: "\u5f8c\u884c\u674e\u7bb1", O: "\u5099\u80ce\u53e3",
    A1: "\u8eca\u5167\u4e2d\u592e\u901a\u9053", T1: "\u884c\u674e\u7bb1", SP1: "\u5099\u80ce\u53e3"
  };

  var CLEAN_ZONE_CATEGORY = {
    C1: "carpet", C2: "carpet", C3: "carpet", C4: "carpet",
    S1: "seat", S2: "seat", S3: "seat", S4: "seat", S5: "seat", S6: "seat", S7: "seat", S8: "seat", S9: "seat",
    M: "space", B: "space", O: "space", A1: "space", T1: "space", SP1: "space"
  };

  function cleanZoneBase(carType) {
    var zones = {
      sedan5: [
        { code: "C1", x: 330, y: 210, w: 118, h: 104 }, { code: "C2", x: 472, y: 205, w: 116, h: 104 },
        { code: "C3", x: 382, y: 342, w: 132, h: 88 }, { code: "C4", x: 526, y: 328, w: 120, h: 110 },
        { code: "S1", x: 386, y: 210, w: 92, h: 110 }, { code: "S2", x: 505, y: 178, w: 96, h: 110 },
        { code: "S3", x: 390, y: 338, w: 150, h: 82 }, { code: "M", x: 514, y: 242, w: 84, h: 174 },
        { code: "B", x: 840, y: 170, w: 250, h: 270 }, { code: "O", x: 916, y: 392, w: 132, h: 54 }
      ],
      suv5: [
        { code: "C1", x: 694, y: 204, w: 126, h: 118 }, { code: "C2", x: 840, y: 204, w: 126, h: 118 },
        { code: "C3", x: 700, y: 344, w: 132, h: 116 }, { code: "C4", x: 844, y: 344, w: 132, h: 116 },
        { code: "S1", x: 692, y: 184, w: 112, h: 122 }, { code: "S2", x: 830, y: 174, w: 112, h: 122 },
        { code: "S3", x: 690, y: 330, w: 246, h: 102 }, { code: "M", x: 790, y: 234, w: 92, h: 202 },
        { code: "B", x: 968, y: 178, w: 174, h: 280 }, { code: "O", x: 1004, y: 382, w: 98, h: 58 }
      ],
      mpv7: [
        { code: "C1", x: 328, y: 828, w: 112, h: 112 }, { code: "C2", x: 454, y: 828, w: 112, h: 112 },
        { code: "C3", x: 360, y: 982, w: 130, h: 116 }, { code: "C4", x: 500, y: 980, w: 120, h: 116 },
        { code: "S1", x: 346, y: 800, w: 106, h: 130 }, { code: "S2", x: 462, y: 800, w: 106, h: 130 },
        { code: "S3", x: 374, y: 1000, w: 156, h: 86 }, { code: "M", x: 512, y: 830, w: 96, h: 240 },
        { code: "S4", x: 556, y: 792, w: 106, h: 142 }, { code: "S5", x: 556, y: 968, w: 106, h: 142 },
        { code: "B", x: 650, y: 842, w: 104, h: 244 }, { code: "O", x: 664, y: 1090, w: 78, h: 56 }
      ],
      van9: [
        { code: "C1", x: 694, y: 830, w: 110, h: 112 }, { code: "C2", x: 812, y: 830, w: 110, h: 112 },
        { code: "C3", x: 696, y: 982, w: 114, h: 112 }, { code: "C4", x: 816, y: 982, w: 114, h: 112 },
        { code: "S1", x: 690, y: 804, w: 110, h: 126 }, { code: "S2", x: 810, y: 804, w: 110, h: 126 },
        { code: "S3", x: 694, y: 992, w: 220, h: 86 }, { code: "M", x: 786, y: 830, w: 92, h: 240 },
        { code: "S6", x: 890, y: 786, w: 100, h: 128 }, { code: "S7", x: 1000, y: 786, w: 100, h: 128 },
        { code: "S8", x: 998, y: 958, w: 102, h: 128 }, { code: "S9", x: 1044, y: 1000, w: 150, h: 92 },
        { code: "B", x: 1088, y: 830, w: 112, h: 220 }, { code: "O", x: 1096, y: 1082, w: 92, h: 54 }
      ]
    }[carType] || [];
    return zones.map(function (zone) {
      return Object.assign({}, zone, { name: CLEAN_ZONE_NAMES[zone.code], price: CLEAN_ZONE_PRICE[zone.code] || 0 });
    });
  }

  function svgSeat(x, y, w, h, label) {
    return "<g class=\"car-seat-unit\">" +
      "<rect x=\"" + x + "\" y=\"" + y + "\" width=\"" + w + "\" height=\"" + h + "\" rx=\"22\" class=\"car-seat-back\"></rect>" +
      "<rect x=\"" + (x + 8) + "\" y=\"" + (y - 18) + "\" width=\"" + (w - 16) + "\" height=\"28\" rx=\"13\" class=\"car-headrest\"></rect>" +
      "<path d=\"M" + (x + 12) + " " + (y + 14) + " H" + (x + w - 12) + " M" + (x + 12) + " " + (y + h - 16) + " H" + (x + w - 12) + "\" class=\"car-seat-line\"></path>" +
      "<text x=\"" + (x + w / 2) + "\" y=\"" + (y + h / 2 + 6) + "\" class=\"car-seat-label\">" + esc(label || "") + "</text>" +
      "</g>";
  }

  function svgBench(x, y, w, h, label) {
    return "<g class=\"car-seat-unit\">" +
      "<rect x=\"" + x + "\" y=\"" + y + "\" width=\"" + w + "\" height=\"" + h + "\" rx=\"22\" class=\"car-seat-back\"></rect>" +
      "<path d=\"M" + (x + w / 3) + " " + (y + 7) + " V" + (y + h - 7) + " M" + (x + w * 2 / 3) + " " + (y + 7) + " V" + (y + h - 7) + "\" class=\"car-seat-line\"></path>" +
      "<text x=\"" + (x + w / 2) + "\" y=\"" + (y + h / 2 + 6) + "\" class=\"car-seat-label\">" + esc(label || "") + "</text>" +
      "</g>";
  }

  function svgDoor(x, y, flip) {
    var d = flip ? "M" + x + " " + y + " C" + (x + 46) + " " + (y - 58) + " " + (x + 98) + " " + (y - 70) + " " + (x + 134) + " " + (y - 48) + " L" + (x + 106) + " " + (y + 18) + " C" + (x + 68) + " " + (y + 8) + " " + (x + 34) + " " + (y + 10) + " " + x + " " + y + "Z"
      : "M" + x + " " + y + " C" + (x + 46) + " " + (y + 58) + " " + (x + 98) + " " + (y + 70) + " " + (x + 134) + " " + (y + 48) + " L" + (x + 106) + " " + (y - 18) + " C" + (x + 68) + " " + (y - 8) + " " + (x + 34) + " " + (y - 10) + " " + x + " " + y + "Z";
    return "<path d=\"" + d + "\" class=\"car-door\"></path>";
  }

  function svgWheel(x, y) {
    return "<g class=\"car-wheel\"><rect x=\"" + x + "\" y=\"" + y + "\" width=\"24\" height=\"70\" rx=\"12\"></rect><line x1=\"" + (x + 12) + "\" y1=\"" + (y + 14) + "\" x2=\"" + (x + 12) + "\" y2=\"" + (y + 56) + "\"></line></g>";
  }

  function svgCarInterior(carType, car) {
    return "<image class=\"clean-floorplan-image\" href=\"./quote-car-floorplan.jpg?v=1\" x=\"0\" y=\"0\" width=\"1280\" height=\"1280\" preserveAspectRatio=\"xMidYMid meet\"></image>" +
      "<rect class=\"clean-type-frame\" x=\"12\" y=\"12\" width=\"1256\" height=\"1256\" rx=\"22\"></rect>" +
      "<text x=\"44\" y=\"48\" class=\"clean-svg-title\">" + esc(car.name) + "</text>";
  }

  function selectedCleanCodes() {
    var raw = document.getElementById("qbCleanZones");
    try { return raw && raw.value ? JSON.parse(raw.value) : []; } catch (e) { return []; }
  }

  function setSelectedCleanCodes(codes) {
    var unique = [];
    codes.forEach(function (code) { if (unique.indexOf(code) === -1) unique.push(code); });
    var raw = document.getElementById("qbCleanZones");
    if (raw) raw.value = JSON.stringify(unique);
  }

  function cleanZonePayload() {
    var carType = builderValue("qbCarType") || "sedan5";
    var zones = cleanZoneBase(carType);
    var selected = selectedCleanCodes();
    return selected.map(function (code) {
      var zone = zones.filter(function (item) { return item.code === code; })[0] || {};
      return {
        code: code,
        name: zone.name || CLEAN_ZONE_NAMES[code] || code,
        category: CLEAN_ZONE_CATEGORY[code] || "space",
        price: Number(zone.price || CLEAN_ZONE_PRICE[code] || 0),
        selectedAt: new Date().toISOString(),
        operator: readDb().currentRole || readDb().role || "front"
      };
    });
  }

  function cleanCategoryLabel(category) {
    return category === "carpet" ? "\u5730\u6bef" : category === "seat" ? "\u5ea7\u6905" : "\u7a7a\u9593";
  }

  function cleanSelectedAreaSnapshot() {
    var zones = cleanZonePayload();
    return {
      carpet: zones.filter(function (zone) { return zone.category === "carpet"; }),
      seat: zones.filter(function (zone) { return zone.category === "seat"; }),
      space: zones.filter(function (zone) { return zone.category === "space"; }),
      total: zones.reduce(function (sum, zone) { return sum + Number(zone.price || 0); }, 0),
      savedAt: new Date().toISOString()
    };
  }

  function renderCleanZoneMap() {
    var box = document.getElementById("cleanZoneMap");
    if (!box) return;
    var carType = builderValue("qbCarType") || "sedan5";
    var car = CAR_TYPES.filter(function (item) { return item.id === carType; })[0] || CAR_TYPES[0];
    var selected = selectedCleanCodes();
    var zones = cleanZoneBase(carType);
    var zoneRects = zones.map(function (zone) {
      var active = selected.indexOf(zone.code) > -1;
      return "<g class=\"clean-zone-hotspot " + (active ? "is-selected" : "") + "\" data-clean-zone=\"" + esc(zone.code) + "\"><rect x=\"" + zone.x + "\" y=\"" + zone.y + "\" width=\"" + zone.w + "\" height=\"" + zone.h + "\" rx=\"14\"></rect><title>" + esc(zone.name) + " " + money(zone.price) + "</title></g>";
    }).join("");
    var zoneLabels = zones.map(function (zone) {
      return "<text x=\"" + (zone.x + zone.w / 2) + "\" y=\"" + (zone.y + zone.h / 2 + 5) + "\" class=\"clean-zone-code\">" + esc(zone.code) + "</text>";
    }).join("");
    var quickSelect = document.getElementById("cleanZoneCarType");
    if (quickSelect && quickSelect.value !== carType) quickSelect.value = carType;
    box.innerHTML = "<svg class=\"clean-car-svg clean-photo-svg\" viewBox=\"0 0 1280 1280\" role=\"img\" aria-label=\"" + esc(car.name) + "\">" +
      svgCarInterior(carType, car) + zoneRects + zoneLabels + "</svg>";
    renderCleanZoneList();
  }

  function renderCleanZoneList() {
    var list = document.getElementById("cleanZoneList");
    if (!list) return;
    var zones = cleanZonePayload();
    var groups = [
      { key: "carpet", title: "\u5df2\u9078\u5730\u6bef\u6e05\u55ae" },
      { key: "seat", title: "\u5df2\u9078\u5ea7\u6905\u6e05\u55ae" },
      { key: "space", title: "\u5df2\u9078\u7a7a\u9593\u6e05\u55ae" }
    ];
    list.innerHTML = zones.length ? groups.map(function (group) {
      var items = zones.filter(function (zone) { return zone.category === group.key; });
      return "<div class=\"clean-zone-selected-group\"><b>" + group.title + "</b><div>" + (items.length ? items.map(function (zone) {
        return "<span class=\"clean-zone-pill\">" + esc(zone.code) + " " + esc(zone.name) + " " + money(zone.price) + "</span>";
      }).join("") : "<span class=\"clean-zone-empty\">\u672a\u9078\u53d6</span>") + "</div></div>";
    }).join("") : "\u5c1a\u672a\u9078\u53d6";
  }

  function toggleCleanZone(code) {
    var selected = selectedCleanCodes();
    var index = selected.indexOf(code);
    if (index >= 0) selected.splice(index, 1);
    else selected.push(code);
    setSelectedCleanCodes(selected);
    renderCleanZoneMap();
    refreshBuilderTotal();
  }

  function toggleCleanGroup(group) {
    var selected = selectedCleanCodes();
    var groupCodes = group === "G1" ? ["C1", "C2"] : group === "G2" ? ["C3", "C4"] : group === "S3" ? ["S3"] : ["C1", "C2", "C3", "C4"];
    var allSelected = groupCodes.every(function (code) { return selected.indexOf(code) > -1; });
    if (allSelected) selected = selected.filter(function (code) { return groupCodes.indexOf(code) === -1; });
    else groupCodes.forEach(function (code) { if (selected.indexOf(code) === -1) selected.push(code); });
    setSelectedCleanCodes(selected);
    renderCleanZoneMap();
    refreshBuilderTotal();
  }

  function applyCleanCarType(value) {
    var mainSelect = document.getElementById("qbCarType");
    var quickSelect = document.getElementById("cleanZoneCarType");
    if (mainSelect && mainSelect.value !== value) mainSelect.value = value;
    if (quickSelect && quickSelect.value !== value) quickSelect.value = value;
    var valid = cleanZoneBase(value).map(function (zone) { return zone.code; });
    setSelectedCleanCodes(selectedCleanCodes().filter(function (code) { return valid.indexOf(code) > -1; }));
    renderCleanZoneMap();
    refreshBuilderTotal();
  }

  function quoteCategory(q) {
    return q.quote_category || q.category || q.service_category || (getItems(q.quote_id)[0] || {}).category || "\u57fa\u790e\u4fdd\u990a";
  }

  function quoteStatus(q) {
    return q.status || T.statusDraft;
  }

  function daysBetween(dateText) {
    var time = dateText ? new Date(dateText).getTime() : 0;
    if (!time || isNaN(time)) return 0;
    return Math.floor((Date.now() - time) / 86400000);
  }

  function quoteStats(quotes) {
    var sum = quotes.reduce(function (n, q) { return n + total(q); }, 0);
    var pending = quotes.filter(function (q) { return /(\u5f85|\u78ba\u8a8d|\u5ba2\u6236)/.test(quoteStatus(q)); }).length;
    var overdue = quotes.filter(function (q) { return /(\u5f85|\u78ba\u8a8d|\u5ba2\u6236)/.test(quoteStatus(q)) && daysBetween(q.updated_at || q.created_at) > 7; }).length;
    return { count: quotes.length, sum: sum, pending: pending, overdue: overdue };
  }

  function categoryCounts(quotes) {
    var base = {
      "\u57fa\u790e\u4fdd\u990a": 0,
      "\u52a0\u8cfc": 0,
      "\u8d08\u9001": 0,
      "\u5916\u5305": 0,
      "\u5176\u4ed6\u5099\u8a3b": 0
    };
    quotes.forEach(function (q) {
      var category = quoteCategory(q);
      if (!base[category]) base[category] = 0;
      base[category] += 1;
    });
    return base;
  }

  function quoteTraceLogs(q) {
    var logs = q.trace_logs || q.logs || [];
    if (!logs.length) {
      logs = [
        { action: "\u5efa\u7acb\u5831\u50f9", user: q.created_by || "front", time: q.created_at || new Date().toISOString() },
        { action: quoteStatus(q), user: q.updated_by || q.created_by || "system", time: q.updated_at || q.created_at || new Date().toISOString() }
      ];
    }
    return logs.map(function (log) {
      return "<li><b>" + esc(log.action || "\u64cd\u4f5c\u7d00\u9304") + "</b><span>" + esc(log.user || "-") + " / " + esc(new Date(log.time || Date.now()).toLocaleString("zh-TW")) + "</span></li>";
    }).join("");
  }

  function statCard(label, value, tone) {
    return "<article class=\"quote-stat-card " + (tone || "") + "\"><span>" + label + "</span><strong>" + value + "</strong><i></i></article>";
  }

  function parameterModule() {
    var fields = ["\u8eca\u8f1b\u5ee0\u724c\u578b\u865f", "\u51fa\u5ee0\u5e74\u4efd", "\u884c\u99db\u91cc\u7a0b", "\u8eca\u724c\u865f\u78bc", "\u8eca\u8eab\u984f\u8272", "\u7dad\u4fee\u8017\u6750\u578b\u865f", "\u5099\u6848\u5099\u8a3b", "\u4ea4\u8eca\u9810\u5b9a\u65e5\u671f"];
    return fields.map(function (name, index) {
      return "<label class=\"quote-toggle-chip\"><input type=\"checkbox\" " + (index < 5 ? "checked" : "") + "><span>" + name + "</span></label>";
    }).join("");
  }

  function categoryModule(counts) {
    var totalCount = Object.keys(counts).reduce(function (sum, key) { return sum + counts[key]; }, 0) || 1;
    var colors = ["#1684e5", "#49a8ff", "#79c7ff", "#9bd8ff", "#c7eaff", "#e8f6ff"];
    var offset = 0;
    var segments = Object.keys(counts).map(function (key, index) {
      var pct = counts[key] / totalCount * 100;
      var start = offset;
      offset += pct;
      return colors[index % colors.length] + " " + start + "% " + offset + "%";
    }).join(", ");
    var legend = Object.keys(counts).map(function (key, index) {
      return "<span><i style=\"background:" + colors[index % colors.length] + "\"></i>" + key + " " + counts[key] + "</span>";
    }).join("");
    return "<div class=\"quote-donut\" style=\"background: conic-gradient(" + segments + ")\"><b>" + totalCount + "</b><small>\u672c\u6708</small></div><div class=\"quote-legend\">" + legend + "</div>";
  }

  function quoteRow(q) {
    var items = getItems(q.quote_id);
    var details = items.map(function (item) {
      return "<li><span>" + esc(item.category) + " / " + esc(item.item_name) + "</span><b>" + money(Number(item.unit_price || 0) * Number(item.qty || 1)) + "</b></li>";
    }).join("");
    return "<tr class=\"quote-summary-row\"><td>" + esc(q.customer_name) + "<small>" + esc(q.phone || "") + "</small></td><td>" + esc(q.plate) + "<small>" + esc(q.car_model || "") + "</small></td><td>" + esc(quoteCategory(q)) + "</td><td><b>" + money(total(q)) + "</b></td><td><span class=\"quote-status\">" + esc(quoteStatus(q)) + "</span><div class=\"quote-row-actions\"><button data-quote-toggle-detail=\"" + esc(q.quote_id) + "\">\u5c55\u958b\u660e\u7d30</button><button data-quote-detail=\"" + esc(q.quote_id) + "\">" + T.detail + "</button><button data-quote-pdf=\"" + esc(q.quote_id) + "\">PDF</button><button data-quote-img=\"" + esc(q.quote_id) + "\">PNG</button><button data-quote-convert=\"" + esc(q.quote_id) + "\">" + T.convert + "</button></div></td></tr>" +
      "<tr class=\"quote-detail-row\" data-quote-detail-row=\"" + esc(q.quote_id) + "\" hidden><td colspan=\"5\"><div class=\"quote-detail-panel\"><section><h4>\u7dad\u4fee\u9805\u76ee\u660e\u7d30</h4><ul>" + details + "</ul></section><section><h4>\u5831\u50f9\u5168\u6b77\u7a0b\u8ffd\u6eaf\u65e5\u8a8c</h4><ol>" + quoteTraceLogs(q) + "</ol></section><section><h4>\u5099\u8a3b</h4><p>" + esc(q.remark || T.footer) + "</p></section></div></td></tr>";
  }

  function quotePaper(q) {
    var rows = getItems(q.quote_id).map(function (item) {
      return "<tr><td>" + esc(item.category) + "</td><td>" + esc(item.item_name) + "</td><td>" + money(item.unit_price) + "</td><td>" + esc(item.qty || 1) + "</td><td>" + money(Number(item.unit_price || 0) * Number(item.qty || 1)) + "</td></tr>";
    }).join("");
    var cleanRows = cleanZoneRows(q);
    var planImages = (q.plan_images || []).map(function (src) { return "<img src=\"" + esc(src) + "\" alt=\"plan image\">"; }).join("");
    return "<article class=\"quote-paper\">" +
      "<header class=\"quote-header\"><div class=\"quote-logo\">" + T.carLogo + "</div><div><h2>" + esc(q.store_name) + "</h2><p>" + T.quoteNo + "\uff1a" + esc(q.quote_id) + " / " + new Date(q.created_at).toLocaleString("zh-TW") + "</p></div></header>" +
      "<div class=\"quote-info\"><span>\u8eca\u4e3b\uff1a" + esc(q.customer_name) + "</span><span>\u96fb\u8a71\uff1a" + esc(q.phone) + "</span><span>\u8eca\u724c\uff1a" + esc(q.plate) + "</span><span>\u8eca\u578b\uff1a" + esc(q.car_model) + "</span><span>\u5e74\u4efd\uff1a" + esc(q.car_year) + "</span><span>\u9810\u7d04\uff1a" + esc(q.appointment_date) + "</span></div>" +
      "<section class=\"quote-section\"><h3>" + T.serviceItems + "</h3><table><thead><tr><th>\u5206\u985e</th><th>\u9805\u76ee</th><th>\u55ae\u50f9</th><th>\u6578\u91cf</th><th>\u5c0f\u8a08</th></tr></thead><tbody>" + rows + "</tbody></table></section>" +
      "<section class=\"quote-section\"><h3>\u6253\u7ffb\u8a55\u4f30\u9078\u53d6\u660e\u7d30</h3><table><thead><tr><th>\u5206\u985e</th><th>\u7de8\u78bc</th><th>\u90e8\u4f4d</th><th>\u55ae\u50f9</th></tr></thead><tbody>" + cleanRows + "</tbody></table></section>" +
      "<section class=\"quote-section\"><h3>\u65bd\u4f5c\u65b9\u5f0f / \u5efa\u8b70\u65b9\u6848</h3><p>\u65bd\u4f5c\u65b9\u5f0f\uff1a" + esc(q.construct_method || "\u672a\u6307\u5b9a") + "</p><p>\u65bd\u4f5c\u5099\u8a3b\uff1a" + esc(q.construct_note || "") + "</p><p>\u5efa\u8b70\u65b9\u6848\uff1a" + esc(q.suggest_plan || "") + "</p><div class=\"quote-paper-images\">" + (planImages || "<span>\u672a\u9644\u5716</span>") + "</div></section>" +
      "<section class=\"quote-total\"><p>" + T.packageTotal + "<b>" + money(q.package_total) + "</b></p><p>" + T.addonTotal + "<b>" + money(q.addon_total) + "</b></p><p>" + T.discount + "<b>-" + money(q.discount_amount) + "</b></p><p class=\"quote-payable\">" + T.payable + "<b>" + money(total(q)) + "</b></p><p>" + T.deposit + "<b>" + money(q.deposit_amount) + "</b></p></section>" +
      "<p class=\"quote-note\">" + T.note + "\uff1a" + esc(q.remark || T.footer) + "</p><footer class=\"quote-sign\"><span>" + T.storeSign + "\uff1a________________</span><span>" + T.customerSign + "\uff1a________________</span></footer></article>";
  }

  function cleanZoneRows(q) {
    var zones = q.clean_selected_zones || [];
    return zones.length ? zones.map(function (zone) {
      return "<tr><td>" + esc(cleanCategoryLabel(zone.category)) + "</td><td>" + esc(zone.code) + "</td><td>" + esc(zone.name) + "</td><td>" + money(zone.price) + "</td></tr>";
    }).join("") : "<tr><td colspan=\"4\">\u672a\u9078\u53d6\u6253\u7ffb\u8a55\u4f30\u90e8\u4f4d</td></tr>";
  }

  function textForPdf(q) {
    var lines = [q.store_name + " " + T.quoteNo, T.quoteNo + "\uff1a" + q.quote_id, "\u8eca\u4e3b\uff1a" + q.customer_name, "\u96fb\u8a71\uff1a" + q.phone, "\u8eca\u724c\uff1a" + q.plate, "\u8eca\u578b\uff1a" + q.car_model, ""];
    getItems(q.quote_id).forEach(function (item) { lines.push(item.category + " / " + item.item_name + " / " + money(item.unit_price)); });
    lines.push("", "\u8eca\u5167\u6e05\u6f54\u9078\u53d6\u90e8\u4f4d\u660e\u7d30");
    (q.clean_selected_zones || []).forEach(function (zone) { lines.push(cleanCategoryLabel(zone.category) + " / " + zone.code + " / " + zone.name + " / " + money(zone.price)); });
    if (!(q.clean_selected_zones || []).length) lines.push("\u672a\u9078\u53d6");
    lines.push("", "\u65bd\u4f5c\u65b9\u5f0f\uff1a" + (q.construct_method || "\u672a\u6307\u5b9a"));
    if (q.construct_note) lines.push("\u65bd\u4f5c\u5099\u8a3b\uff1a" + q.construct_note);
    if (q.suggest_plan) lines.push("\u5efa\u8b70\u65b9\u6848\uff1a" + q.suggest_plan);
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
    app.innerHTML = "<div class=\"quote-export-page\"><header class=\"topbar\"><div class=\"brand\"><div class=\"logo\">" + T.carLogo + "</div><div><h1>" + title + "</h1><small>\u5831\u50f9\u532f\u51fa\u8207\u5de5\u55ae\u8ffd\u6eaf</small></div></div><div class=\"quote-top-actions\"><button class=\"ghost-btn\" data-quote-back>" + T.back + "</button><button class=\"ghost-btn\" data-quote-home>\u56de\u5de5\u4f5c\u53f0</button></div></header>" + html + "</div>";
    document.body.setAttribute("data-quote-active", "1");
    if (!history.state || !history.state.quotePage) {
      try { history.pushState({ quotePage: true }, "", location.href); } catch (e) {}
    }
    window.scrollTo(0, 0);
  }

  function rememberQuoteReturn() {
    var data = readDb();
    var app = document.getElementById("app");
    if (app && !app.querySelector(".quote-export-page")) {
      try {
        sessionStorage.setItem("beauty-crm-quote-return-html", app.innerHTML);
        sessionStorage.setItem("beauty-crm-quote-return-view", data.view || "");
      } catch (e) {}
    }
    if (data.view && !document.querySelector(".quote-export-page")) data.quoteReturnView = data.view;
    saveDb();
  }

  function quoteBack() {
    var data = readDb();
    var app = document.getElementById("app");
    var savedHtml = "";
    var savedView = "";
    try {
      savedHtml = sessionStorage.getItem("beauty-crm-quote-return-html") || "";
      savedView = sessionStorage.getItem("beauty-crm-quote-return-view") || "";
      sessionStorage.removeItem("beauty-crm-quote-return-html");
      sessionStorage.removeItem("beauty-crm-quote-return-view");
    } catch (e) {}
    document.body.removeAttribute("data-quote-active");
    delete data.quoteReturnView;
    if (savedView) data.view = savedView;
    saveDb();
    if (app && savedHtml) {
      app.innerHTML = savedHtml;
      document.dispatchEvent(new CustomEvent("ui:stabilize"));
      window.scrollTo(0, 0);
      return;
    }
    quoteHome();
  }

  function quoteHome() {
    var data = readDb();
    document.body.removeAttribute("data-quote-active");
    delete data.quoteReturnView;
    saveDb();
    if (typeof window.go === "function") window.go(data.authed ? "adminHome" : "home");
    else location.href = location.pathname + "?fresh=home";
  }

  function quoteListPage() {
    var quotes = readDb().quoteEstimates;
    var stats = quoteStats(quotes);
    var rows = quotes.map(quoteRow).join("") || "<tr><td colspan=\"5\">\u5c1a\u7121\u5831\u50f9\u55ae</td></tr>";
    setMain("\u5831\u50f9", "<section class=\"quote-stat-grid\">" +
      statCard("\u5831\u50f9\u55ae\u7e3d\u6578", stats.count + " \u5f35") +
      statCard("\u7d2f\u8a08\u5831\u50f9\u7e3d\u91d1\u984d", money(stats.sum)) +
      statCard("\u5f85\u5ba2\u6236\u78ba\u8a8d\u5831\u50f9\u6578", stats.pending + " \u5f35", "danger") +
      statCard("\u903e\u671f\u672a\u8ddf\u9032\u5831\u50f9\u6578", stats.overdue + " \u5f35", "danger") +
      "</section><main class=\"quote-workbench\"><aside class=\"quote-side-modules\"><section class=\"glass-card quote-module-card\"><h3>\u81ea\u5b9a\u7fa9\u5831\u50f9\u53c3\u6578\u6a19\u7c64</h3><p>\u5e38\u7528\u8eca\u8f1b\u8207\u9580\u5e97\u8a18\u9304\u6b04\u4f4d\uff0c\u53ef\u958b\u555f / \u96b1\u85cf\u8f14\u52a9\u5831\u50f9\u3002</p><div class=\"quote-toggle-list\">" + parameterModule() + "</div></section><section class=\"glass-card quote-module-card\"><h3>\u5831\u50f9\u5206\u985e\u7ba1\u7406</h3><p>\u9810\u8a2d\uff1a\u57fa\u790e\u4fdd\u990a\u3001\u52a0\u8cfc\u3001\u8d08\u9001\u3001\u5916\u5305\u3001\u5176\u4ed6\u5099\u8a3b</p>" + categoryModule(categoryCounts(quotes)) + "</section><section class=\"glass-card quote-module-card\"><h3>\u5831\u50f9\u5168\u6b77\u7a0b\u8ffd\u6eaf\u65e5\u8a8c</h3><p>\u8a18\u9304\u5efa\u7acb\u3001\u4fee\u6539\u3001\u5ba2\u6236\u78ba\u8a8d\u3001\u8f49\u65bd\u5de5\u55ae\u3001\u4f5c\u5ee2\u8207\u6536\u6b3e\u5099\u8a3b\u3002</p><ul class=\"quote-mini-log\"><li>\u6c38\u4e45\u5b58\u6a94</li><li>\u4fdd\u7559\u64cd\u4f5c\u4eba</li><li>\u4fdd\u7559\u6642\u9593\u6233</li></ul></section></aside><section class=\"quote-list-panel glass-card\"><div class=\"quote-list-head\"><div><h2>\u5831\u50f9\u6e05\u55ae</h2><small>\u56fa\u5b9a\u6b04\u4f4d\uff1a\u5ba2\u6236\u59d3\u540d \u2192 \u8eca\u724c\u865f\u78bc \u2192 \u5831\u50f9\u5206\u985e \u2192 \u7e3d\u91d1\u984d \u2192 \u7576\u524d\u72c0\u614b</small></div><input id=\"quoteSearchInput\" class=\"quote-search\" placeholder=\"\u641c\u5c0b\u5ba2\u6236\u540d\u3001\u8eca\u724c\u3001\u5099\u8a3b\"></div><div class=\"table-wrap\"><table class=\"quote-modern-table\"><thead><tr><th>\u5ba2\u6236\u59d3\u540d</th><th>\u8eca\u724c\u865f\u78bc</th><th>\u5831\u50f9\u5206\u985e</th><th>\u7e3d\u91d1\u984d</th><th>\u7576\u524d\u72c0\u614b</th></tr></thead><tbody>" + rows + "</tbody></table></div></section></main>");
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
    var data = readDb();
    var options = [];
    (data.cfg && data.cfg.plans || []).forEach(function (item) {
      options.push({ id: "plan:" + item.id, type: "package", category: item.category || "\u57fa\u790e\u4fdd\u990a", name: item.name, price: Number(item.price || item.amount || 0) });
    });
    (data.cfg && data.cfg.addons || []).forEach(function (item) {
      options.push({ id: "addon:" + item.id, type: "addon", category: item.category || "\u52a0\u8cfc", name: item.name, price: Number(item.price || item.amount || 0) });
    });
    (data.menu || []).filter(function (item) { return item.online !== false && !item.deleted; }).forEach(function (item) {
      var category = item.category || "\u52a0\u8cfc";
      var type = /(\u8d08|\u8d08\u9001|\u8d08\u54c1)/.test(category) ? "gift" : /(\u5957\u9910|\u57fa\u790e|\u55ae\u9805|\u65b9\u6848)/.test(category) ? "package" : "addon";
      options.push({ id: "menu:" + item.id, type: type, category: category, name: item.name, price: Number(item.amount || item.price || 0) });
    });
    if (options.length) return options;
    return [
      { id: "pkg9999", type: "package", category: "\u6574\u65b0\u5957\u9910", name: "9999 \u5167\u5916\u8d85\u503c", price: 9999 },
      { id: "deepclean", type: "package", category: "\u5167\u88dd\u5957\u9910", name: "\u5167\u88dd\u6df1\u5c64\u62c6\u6d17", price: 6800 },
      { id: "coating", type: "package", category: "\u934d\u819c\u5957\u9910", name: "\u5916\u89c0\u934d\u819c", price: 12800 },
      { id: "glass", type: "addon", category: "\u73bb\u7483\u7cfb\u5217", name: "\u73bb\u7483\u6cb9\u819c\u934d\u819c", price: 1800 },
      { id: "chassis", type: "addon", category: "\u5176\u4ed6\u7cfb\u5217", name: "\u5e95\u76e4\u6e05\u6d17", price: 2200 },
      { id: "smoke", type: "addon", category: "\u5167\u88dd\u52a0\u8cfc", name: "\u7159\u5473\u8655\u7406", price: 1500 },
      { id: "mold", type: "addon", category: "\u5167\u88dd\u52a0\u8cfc", name: "\u767c\u9709\u8655\u7406", price: 2500 },
      { id: "pet", type: "addon", category: "\u5167\u88dd\u52a0\u8cfc", name: "\u5bf5\u7269\u7570\u5473", price: 1800 },
      { id: "giftGlass", type: "gift", category: "\u8d08\u9001", name: "\u96e8\u5b63\u73bb\u7483\u6aa2\u67e5", price: 0 }
    ];
  }

  function quoteSelect(id, label, items, placeholder) {
    var opts = "<option value=\"\">" + placeholder + "</option>" + items.map(function (item) {
      return "<option value=\"" + esc(item.id) + "\">" + esc(item.name) + " / " + esc(item.category) + " / " + money(item.price) + "</option>";
    }).join("");
    return "<label class=\"quote-select-field\"><span>" + label + "</span><select id=\"" + id + "\">" + opts + "</select></label>";
  }

  function simpleSelect(id, label, items, selected) {
    var opts = items.map(function (item) {
      return "<option value=\"" + esc(item.id) + "\" " + (item.id === selected ? "selected" : "") + ">" + esc(item.name) + "</option>";
    }).join("");
    return "<label class=\"quote-select-field\"><span>" + label + "</span><select id=\"" + id + "\">" + opts + "</select></label>";
  }

  function cleanCarTypeSelect(selected) {
    var opts = CAR_TYPES.map(function (item) {
      return "<option value=\"" + esc(item.id) + "\" " + (item.id === selected ? "selected" : "") + ">" + esc(item.name) + "</option>";
    }).join("");
    return "<label class=\"clean-zone-type-select\"><span>\u8eca\u578b\u5716\u5207\u63db</span><select id=\"cleanZoneCarType\">" + opts + "</select></label>";
  }

  function constructMethodOptions() {
    var data = readDb();
    if (!data.quoteConstructMethods) {
      data.quoteConstructMethods = [
        "\u5c40\u90e8\u6df1\u5c64\u6e05\u6f54",
        "\u5168\u8eca\u5167\u88dd\u62c6\u6d17",
        "\u84b8\u6c23\u6bba\u83cc+\u9664\u5473",
        "\u6c61\u6f2c\u5f37\u5316\u8655\u7406"
      ];
    }
    return data.quoteConstructMethods;
  }

  function cleanOptionButton(code, label) {
    return "<button type=\"button\" data-clean-zone-button=\"" + esc(code) + "\"><span>" + esc(label || CLEAN_ZONE_NAMES[code] || code) + "</span><small>" + money(CLEAN_ZONE_PRICE[code] || 0) + "</small></button>";
  }

  function builderPlanImages() {
    var raw = document.getElementById("qbPlanImagesData");
    try { return raw && raw.value ? JSON.parse(raw.value) : []; } catch (e) { return []; }
  }

  function setBuilderPlanImages(images) {
    var raw = document.getElementById("qbPlanImagesData");
    if (raw) raw.value = JSON.stringify(images || []);
  }

  function renderPlanImagePreview() {
    var box = document.getElementById("qbPlanImagePreview");
    if (!box) return;
    var images = builderPlanImages();
    box.innerHTML = images.length ? images.map(function (src, index) {
      return "<figure><img src=\"" + esc(src) + "\" alt=\"plan image " + index + "\"><button type=\"button\" data-remove-plan-image=\"" + index + "\">\u522a\u9664</button></figure>";
    }).join("") : "<span>\u5c1a\u672a\u4e0a\u50b3\u5716\u7247</span>";
  }

  function handlePlanImages(files) {
    var list = Array.prototype.slice.call(files || []).slice(0, 5);
    if (!list.length) return;
    Promise.all(list.map(function (file) {
      return new Promise(function (resolve) {
        var reader = new FileReader();
        reader.onload = function () { resolve(reader.result); };
        reader.onerror = function () { resolve(""); };
        reader.readAsDataURL(file);
      });
    })).then(function (images) {
      setBuilderPlanImages(builderPlanImages().concat(images.filter(Boolean)).slice(0, 8));
      renderPlanImagePreview();
    });
  }

  function optionById(id) {
    return quoteServiceOptions().filter(function (item) { return item.id === id; })[0];
  }

  function quoteBuilderPage() {
    var base = latestOrderLike();
    var services = quoteServiceOptions();
    var packages = services.filter(function (item) { return item.type === "package"; });
    var addons = services.filter(function (item) { return item.type === "addon"; });
    var gifts = services.filter(function (item) { return item.type === "gift"; });
    setMain(T.quoteBuilder, "<main class=\"quote-builder-grid\"><section class=\"glass-card quote-form-card\"><h2>\u5ba2\u6236\u8207\u8eca\u8f1b\u8cc7\u6599</h2><div class=\"quote-form-grid\">" +
      quoteField("qbName", "\u7a31\u547c", base.name || base.customer_name || "") +
      quoteField("qbPhone", "\u806f\u7d61\u96fb\u8a71", base.phone || "") +
      quoteField("qbPlate", "\u8eca\u724c", base.plate || "") +
      quoteField("qbCar", "\u8eca\u578b", base.car || base.carModel || base.model || "") +
      simpleSelect("qbCarType", "\u8eca\u5167\u5e73\u9762\u5716\u8eca\u578b", CAR_TYPES, "sedan5") +
      quoteField("qbYear", "\u5e74\u4efd", base.year || base.carYear || "") +
      quoteField("qbStore", "\u9580\u5e02", base.store || base.branch || "\u4e09\u91cd") +
      quoteField("qbDate", "\u9810\u7d04\u65e5\u671f / \u6642\u9593", base.date || base.appointmentDate || "") +
      quoteField("qbDeposit", "\u5df2\u6536\u8a02\u91d1", base.deposit || "0", "number") +
      quoteField("qbDiscount", "\u512a\u60e0\u6298\u6263", "0", "number") +
      "<label class=\"quote-field quote-field-wide\"><span>\u5099\u8a3b</span><textarea id=\"qbNote\" rows=\"4\">" + esc(base.note || "") + "</textarea></label></div><input type=\"hidden\" id=\"qbCleanZones\" value=\"[]\"><input type=\"hidden\" id=\"qbPlanImagesData\" value=\"[]\"><section class=\"clean-zone-card\"><div class=\"clean-zone-head clean-zone-head-row\"><div><h2>\u4f4d\u7f6e\u793a\u610f\u5716</h2><p>\u5148\u9078\u8eca\u578b\uff0c\u518d\u9ede\u9078\u5730\u6bef\u3001\u5ea7\u6905\u6216\u5716\u5167\u5340\u584a\u3002</p></div>" + cleanCarTypeSelect("sedan5") + "</div><div class=\"clean-zone-choice-grid\"><div class=\"clean-option-card\"><h3>\u5730\u6bef\u9078\u9805\u7d44</h3><div class=\"clean-zone-toolbar\">" + cleanOptionButton("C1") + cleanOptionButton("C2") + cleanOptionButton("C3") + cleanOptionButton("C4") + "<button type=\"button\" data-clean-zone-group=\"G1\"><span>\u524d\u6392\u5408\u4f75\u5730\u6bef</span><small>G1</small></button><button type=\"button\" data-clean-zone-group=\"G2\"><span>\u5f8c\u6392\u5408\u4f75\u5730\u6bef</span><small>G2</small></button><button type=\"button\" data-clean-zone-group=\"ALL-C\"><span>\u5168\u8eca\u5730\u6bef</span><small>ALL-C</small></button></div></div><div class=\"clean-option-card clean-seat-card\"><h3>\u5ea7\u6905\u9078\u9805\u7d44</h3><div class=\"clean-seat-buttons\">" + cleanOptionButton("S1") + cleanOptionButton("S2") + cleanOptionButton("S3") + "</div><img src=\"./quote-seat-guide.jpg?v=1\" alt=\"\u5ea7\u6905\u793a\u610f\u5716\"></div><div class=\"clean-option-card\"><h3>\u7a7a\u9593\u5340\u57df</h3><div class=\"clean-zone-toolbar\">" + cleanOptionButton("M") + cleanOptionButton("B") + cleanOptionButton("O") + "</div></div></div><div id=\"cleanZoneMap\"></div><div class=\"clean-range-panel\"><h3>\u7bc4\u570d\u793a\u610f\u5716 / \u5df2\u9078\u6e05\u55ae</h3><div id=\"cleanZoneList\" class=\"clean-zone-list\">\u5c1a\u672a\u9078\u53d6</div></div><div class=\"quote-eval-fields\"><label class=\"quote-field\"><span>\u65bd\u4f5c\u65b9\u5f0f</span><select id=\"qbConstructMethod\">" + constructMethodOptions().map(function (method) { return "<option value=\"" + esc(method) + "\">" + esc(method) + "</option>"; }).join("") + "</select></label><label class=\"quote-field quote-field-wide\"><span>\u65bd\u4f5c\u5099\u8a3b</span><textarea id=\"qbConstructNote\" rows=\"3\"></textarea></label><label class=\"quote-field quote-field-wide\"><span>\u5efa\u8b70\u505a\u6cd5 / \u65b9\u6848</span><textarea id=\"qbSuggestPlan\" rows=\"4\" placeholder=\"\u4f8b\uff1a\u5efa\u8b70\u5f8c\u5ea7\u9023\u540c\u5730\u6bef\u4e00\u8d77\u6df1\u5c64\u8655\u7406\"></textarea></label><label class=\"quote-field\"><span>\u5efa\u8b70\u65b9\u6848\u5716\u7247</span><input id=\"qbPlanImages\" type=\"file\" accept=\"image/*\" multiple></label><div id=\"qbPlanImagePreview\" class=\"quote-plan-preview\"><span>\u5c1a\u672a\u4e0a\u50b3\u5716\u7247</span></div><label class=\"quote-field\"><span>\u6700\u7d42\u5831\u50f9\uff08\u53ef\u624b\u52d5\u4fee\u6539\uff09</span><input id=\"qbFinalPrice\" type=\"number\" placeholder=\"\u7cfb\u7d71\u81ea\u52d5\u5e36\u5165\"></label></div></section></section>" +
      "<section class=\"glass-card quote-form-card\"><h2>\u9078\u64c7\u5957\u9910 / \u52a0\u8cfc / \u8d08\u9001</h2><div class=\"quote-dropdown-stack\">" +
      quoteSelect("qbPackageSelect", "\u5957\u9910", packages, "\u8acb\u9078\u64c7\u5957\u9910") +
      "<div class=\"quote-dropdown-add\">" + quoteSelect("qbAddonSelect", "\u52a0\u8cfc", addons, "\u8acb\u9078\u64c7\u52a0\u8cfc\u9805\u76ee") + "<button data-add-dropdown-quote-item=\"qbAddonSelect\">\u52a0\u5165\u52a0\u8cfc</button></div>" +
      "<div class=\"quote-dropdown-add\">" + quoteSelect("qbGiftSelect", "\u8d08\u9001", gifts, "\u8acb\u9078\u64c7\u8d08\u9001\u9805\u76ee") + "<button data-add-dropdown-quote-item=\"qbGiftSelect\">\u52a0\u5165\u8d08\u9001</button></div>" +
      "</div><div id=\"qbSelectedItems\" class=\"quote-custom-items\"></div><div class=\"quote-custom-line\"><input id=\"qbCustomName\" placeholder=\"\u81ea\u8a02\u9805\u76ee\u540d\u7a31\"><input id=\"qbCustomPrice\" type=\"number\" placeholder=\"\u91d1\u984d\"><button data-add-custom-quote-item>\u52a0\u5165\u81ea\u8a02\u9805\u76ee</button></div><div id=\"qbCustomItems\" class=\"quote-custom-items\"></div><aside class=\"quote-live-total\"><p>\u5957\u9910/\u52a0\u8cfc\u5408\u8a08 <b id=\"qbSubtotal\">$0</b></p><p>\u512a\u60e0\u6298\u6263 <b id=\"qbDiscountView\">-$0</b></p><p class=\"quote-payable\">\u6700\u7d42\u5831\u50f9 <b id=\"qbFinal\">$0</b></p><button data-create-quote-from-builder>" + T.createQuote + "</button></aside></section></main>");
    renderCleanZoneMap();
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
    var items = [];
    var packageItem = optionById(builderValue("qbPackageSelect"));
    if (packageItem) items.push({ category: packageItem.category, item_name: packageItem.name, unit_price: Number(packageItem.price || 0), qty: 1 });
    cleanZonePayload().forEach(function (zone) {
      items.push({ category: "\u52a0\u8cfc-" + cleanCategoryLabel(zone.category), item_name: "\u6253\u7ffb\u8a55\u4f30-" + zone.name, unit_price: Number(zone.price || 0), qty: 1, clean_code: zone.code });
    });
    Array.prototype.slice.call(document.querySelectorAll("[data-selected-quote-item]")).forEach(function (node) {
      items.push({
        category: node.getAttribute("data-category") || "\u52a0\u8cfc",
        item_name: node.getAttribute("data-name") || "",
        unit_price: Number(node.getAttribute("data-price") || 0),
        qty: 1
      });
    });
    Array.prototype.slice.call(document.querySelectorAll("[data-custom-quote-item]")).forEach(function (node) {
      items.push({
        category: node.getAttribute("data-category") || "\u81ea\u8a02\u9805\u76ee",
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
    var computedFinal = Math.max(0, subtotal - discount);
    var subtotalNode = document.getElementById("qbSubtotal");
    var discountNode = document.getElementById("qbDiscountView");
    var finalNode = document.getElementById("qbFinal");
    var finalInput = document.getElementById("qbFinalPrice");
    if (subtotalNode) subtotalNode.textContent = money(subtotal);
    if (discountNode) discountNode.textContent = "-" + money(discount);
    if (finalNode) finalNode.textContent = money(finalInput && finalInput.value ? Number(finalInput.value || 0) : computedFinal);
    if (finalInput && !finalInput.getAttribute("data-manual-final")) finalInput.value = computedFinal;
  }

  function addDropdownBuilderItem(selectId) {
    var item = optionById(builderValue(selectId));
    var box = document.getElementById("qbSelectedItems");
    if (!item || !box) return alert("\u8acb\u5148\u9078\u64c7\u9805\u76ee");
    box.insertAdjacentHTML("beforeend", "<span class=\"quote-custom-pill\" data-selected-quote-item data-category=\"" + esc(item.category) + "\" data-name=\"" + esc(item.name) + "\" data-price=\"" + esc(item.price) + "\">" + esc(item.category) + " / " + esc(item.name) + " " + money(item.price) + "<button data-remove-selected-quote-item>\u00d7</button></span>");
    refreshBuilderTotal();
  }

  function addCustomBuilderItem() {
    var name = builderValue("qbCustomName");
    var price = Number(builderValue("qbCustomPrice") || 0);
    if (!name || !price) return alert("\u8acb\u586b\u5beb\u81ea\u8a02\u9805\u76ee\u540d\u7a31\u8207\u91d1\u984d");
    var box = document.getElementById("qbCustomItems");
    if (!box) return;
    box.insertAdjacentHTML("beforeend", "<span class=\"quote-custom-pill\" data-custom-quote-item data-category=\"\u81ea\u8a02\u9805\u76ee\" data-name=\"" + esc(name) + "\" data-price=\"" + esc(price) + "\">" + esc(name) + " " + money(price) + "<button data-remove-custom-quote-item>\u00d7</button></span>");
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
    var cleanZones = cleanZonePayload();
    var selectedArea = cleanSelectedAreaSnapshot();
    var finalPrice = Number(builderValue("qbFinalPrice") || Math.max(0, packageTotal - discount));
    var quote = {
      quote_id: quoteId,
      store_code: builderValue("qbStore") || "\u4e09\u91cd",
      store_name: (builderValue("qbStore") || "\u4e09\u91cd") + "\u6c7d\u8eca\u7f8e\u5bb9",
      customer_name: builderValue("qbName"),
      phone: builderValue("qbPhone"),
      plate: builderValue("qbPlate"),
      car_model: builderValue("qbCar"),
      car_type: builderValue("qbCarType") || "sedan5",
      clean_selected_zones: cleanZones,
      selected_area: selectedArea,
      car_year: builderValue("qbYear"),
      package_total: packageTotal,
      addon_total: 0,
      discount_amount: discount,
      final_price: finalPrice,
      deposit_amount: Number(builderValue("qbDeposit") || 0),
      appointment_date: builderValue("qbDate"),
      construct_method: builderValue("qbConstructMethod"),
      construct_note: builderValue("qbConstructNote"),
      suggest_plan: builderValue("qbSuggestPlan"),
      plan_images: builderPlanImages(),
      remark: builderValue("qbNote") || T.footer,
      status: "\u5f85\u5ba2\u6236\u78ba\u8a8d",
      created_by: "front",
      created_at: new Date().toISOString(),
      trace_logs: [{
        action: "\u5efa\u7acb\u5831\u50f9",
        user: "front",
        time: new Date().toISOString()
      }, {
        action: "\u9078\u53d6\u8eca\u5167\u6e05\u6f54\u5340\u57df\uff1a" + (cleanZones.length ? cleanZones.map(function (zone) { return zone.code + " " + zone.name; }).join("\u3001") : "\u7121"),
        user: "front",
        time: new Date().toISOString()
      }, {
        action: "\u6253\u7ffb\u8a55\u4f30\u5831\u50f9\uff1a" + money(finalPrice) + "\uff0c\u65bd\u4f5c\u65b9\u5f0f\uff1a" + (builderValue("qbConstructMethod") || "\u672a\u6307\u5b9a"),
        user: "front",
        time: new Date().toISOString()
      }],
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
        qty: item.qty || 1,
        clean_code: item.clean_code || ""
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
    if (b.hasAttribute("data-quote-page")) {
      rememberQuoteReturn();
      quoteListPage();
    }
    if (b.hasAttribute("data-quote-workorders")) {
      rememberQuoteReturn();
      workOrderPage();
    }
    if (b.hasAttribute("data-quote-list")) quoteListPage();
    if (b.hasAttribute("data-quote-back")) quoteBack();
    if (b.hasAttribute("data-quote-home")) quoteHome();
    if (b.hasAttribute("data-quote-modal-close")) {
      var modal = document.querySelector("[data-quote-created-modal]");
      if (modal) modal.remove();
    }
    if (b.hasAttribute("data-make-quote-front")) {
      rememberQuoteReturn();
      quoteBuilderPage();
    }
    if (b.getAttribute("data-add-dropdown-quote-item")) addDropdownBuilderItem(b.getAttribute("data-add-dropdown-quote-item"));
    if (b.getAttribute("data-clean-zone-group")) toggleCleanGroup(b.getAttribute("data-clean-zone-group"));
    if (b.getAttribute("data-clean-zone-button")) toggleCleanZone(b.getAttribute("data-clean-zone-button"));
    if (b.hasAttribute("data-add-custom-quote-item")) addCustomBuilderItem();
    if (b.hasAttribute("data-remove-custom-quote-item")) {
      var custom = b.closest("[data-custom-quote-item]");
      if (custom) custom.remove();
      refreshBuilderTotal();
    }
    if (b.hasAttribute("data-remove-selected-quote-item")) {
      var selected = b.closest("[data-selected-quote-item]");
      if (selected) selected.remove();
      refreshBuilderTotal();
    }
    if (b.hasAttribute("data-create-quote-from-builder")) createQuoteFromBuilder();
    if (b.getAttribute("data-quote-detail")) quoteDetailPage(b.getAttribute("data-quote-detail"));
    if (b.getAttribute("data-quote-pdf")) exportPdf(b.getAttribute("data-quote-pdf"));
    if (b.getAttribute("data-quote-img")) exportImage(b.getAttribute("data-quote-img"));
    if (b.getAttribute("data-quote-convert")) convertToWorkOrder(b.getAttribute("data-quote-convert"));
    if (b.getAttribute("data-quote-toggle-detail")) {
      var row = document.querySelector("[data-quote-detail-row=\"" + b.getAttribute("data-quote-toggle-detail") + "\"]");
      if (row) row.hidden = !row.hidden;
    }
    if (b.getAttribute("data-workorder-done")) markWorkOrderDone(b.getAttribute("data-workorder-done"));
    if (b.getAttribute("data-completion-pdf")) exportCompletionPdf(b.getAttribute("data-completion-pdf"));
    if (b.getAttribute("data-completion-img")) exportCompletionImage(b.getAttribute("data-completion-img"));
    if (b.getAttribute("data-remove-plan-image")) {
      var images = builderPlanImages();
      images.splice(Number(b.getAttribute("data-remove-plan-image")), 1);
      setBuilderPlanImages(images);
      renderPlanImagePreview();
    }
  });

  document.addEventListener("input", function (event) {
    if (event.target && (event.target.matches("[data-quote-service]") || event.target.id === "qbDiscount" || event.target.id === "qbPackageSelect")) refreshBuilderTotal();
    if (event.target && event.target.id === "qbFinalPrice") {
      event.target.setAttribute("data-manual-final", "1");
      refreshBuilderTotal();
    }
    if (event.target && event.target.id === "quoteSearchInput") {
      var keyword = event.target.value.trim().toLowerCase();
      Array.prototype.slice.call(document.querySelectorAll(".quote-summary-row")).forEach(function (row) {
        var detail = row.nextElementSibling;
        var show = !keyword || row.textContent.toLowerCase().indexOf(keyword) > -1 || (detail && detail.textContent.toLowerCase().indexOf(keyword) > -1);
        row.style.display = show ? "" : "none";
        if (detail) detail.style.display = show ? "" : "none";
      });
    }
  });

  document.addEventListener("change", function (event) {
    if (event.target && (event.target.matches("[data-quote-service]") || event.target.id === "qbPackageSelect")) refreshBuilderTotal();
    if (event.target && event.target.id === "qbCarType") {
      applyCleanCarType(event.target.value);
    }
    if (event.target && event.target.id === "cleanZoneCarType") {
      applyCleanCarType(event.target.value);
    }
    if (event.target && event.target.id === "qbPlanImages") {
      handlePlanImages(event.target.files);
      event.target.value = "";
    }
  });

  document.addEventListener("click", function (event) {
    var zone = event.target.closest && event.target.closest("[data-clean-zone]");
    if (!zone) return;
    toggleCleanZone(zone.getAttribute("data-clean-zone"));
  });

  window.addEventListener("popstate", function () {
    if (document.body.getAttribute("data-quote-active") === "1") quoteBack();
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
