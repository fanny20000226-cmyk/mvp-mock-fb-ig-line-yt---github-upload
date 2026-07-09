const express = require("express");
const fs = require("fs");
const path = require("path");

function requirePdfKit() {
  try {
    return require("pdfkit");
  } catch (error) {
    error.code = "PDFKIT_MISSING";
    throw error;
  }
}

function requireSharp() {
  try {
    return require("sharp");
  } catch (error) {
    error.code = "SHARP_MISSING";
    throw error;
  }
}

async function one(db, sql, params) {
  if (db.get) return db.get(sql, params);
  const [rows] = await db.execute(sql, params);
  return rows[0];
}

async function all(db, sql, params) {
  if (db.all) return db.all(sql, params);
  const [rows] = await db.execute(sql, params);
  return rows;
}

async function run(db, sql, params) {
  if (db.run) return db.run(sql, params);
  return db.execute(sql, params);
}

function canExport(user, order) {
  const role = user && (user.role || user.role_code);
  if (["TECHNICIAN", "EMPLOYEE"].includes(role)) return false;
  if (["SUPER_ADMIN", "HQ_ADMIN", "FINANCE_ADMIN"].includes(role)) return true;
  if (["STORE_MANAGER"].includes(role)) return user.store_code === order.store_code;
  if (["SALES"].includes(role)) return String(user.id) === String(order.created_by);
  return false;
}

async function bundle(db, orderNo) {
  const order = await one(db, "SELECT * FROM work_order WHERE order_no = ? OR work_order_id = ?", [orderNo, orderNo]);
  if (!order) return null;
  const quote = await one(db, "SELECT * FROM quote_estimate WHERE quote_id = ?", [order.bind_quote_id]);
  const items = quote ? await all(db, "SELECT * FROM quote_estimate_item WHERE quote_id = ? ORDER BY id ASC", [quote.quote_id]) : [];
  return { order, quote: quote || {}, items };
}

function pdfBuffer(data) {
  const PDFDocument = requirePdfKit();
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 42 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(22).text("車輛完工確認施工單");
    doc.moveDown(.4).fontSize(12)
      .text(`工單編號：${data.order.order_no || data.order.work_order_id}`)
      .text(`原始報價：${data.order.bind_quote_id || ""}`)
      .text(`客戶：${data.order.customer_name || data.quote.customer_name || ""}`)
      .text(`車牌：${data.order.plate || data.quote.plate || ""}`)
      .text(`完工時間：${data.order.finish_time || data.order.completed_at || new Date().toISOString()}`);
    doc.moveDown();
    doc.fontSize(14).text("原始報價套餐明細", { underline: true });
    data.items.forEach((item) => {
      doc.fontSize(11).text(`${item.category || ""} / ${item.item_name || item.name || ""} / ${item.unit_price || item.price || 0}`);
    });
    doc.moveDown();
    doc.fontSize(14).text("施工確認", { underline: true });
    doc.fontSize(12)
      .text(`施工備註：${data.order.completion_remark || ""}`)
      .text("檢驗確認欄：________________")
      .text("技師簽名：________________")
      .text("客戶取車簽名：________________");
    doc.end();
  });
}

module.exports = function workorderRoutes(db, authMiddleware) {
  const router = express.Router();
  const uploadDir = path.join(process.cwd(), "uploads", "workorders");
  fs.mkdirSync(uploadDir, { recursive: true });

  if (authMiddleware) router.use(authMiddleware);

  router.get("/export-completion-doc/:order_no", async (req, res) => {
    try {
      const format = (req.query.format || "pdf").toLowerCase();
      const data = await bundle(db, req.params.order_no);
      if (!data) return res.status(404).json({ message: "工單不存在" });
      if (!canExport(req.user || {}, data.order)) return res.status(403).json({ message: "權限不足" });
      if (!["施工完成", "結案", "已完工"].includes(data.order.status)) return res.status(409).json({ message: "工單尚未完工" });

      if (format === "png" && data.order.completion_img_path && fs.existsSync(data.order.completion_img_path)) {
        return res.download(data.order.completion_img_path);
      }
      if (format !== "png" && data.order.completion_file_path && fs.existsSync(data.order.completion_file_path)) {
        return res.download(data.order.completion_file_path);
      }

      const pdf = await pdfBuffer(data);
      if (format === "png") {
        const sharp = requireSharp();
        const png = await sharp(pdf, { density: 300 }).png().toBuffer();
        const pngPath = path.join(uploadDir, `${req.params.order_no}.png`);
        fs.writeFileSync(pngPath, png);
        await run(db, "UPDATE work_order SET completion_img_path = ? WHERE order_no = ? OR work_order_id = ?", [pngPath, req.params.order_no, req.params.order_no]);
        res.setHeader("Content-Type", "image/png");
        return res.send(png);
      }

      const pdfPath = path.join(uploadDir, `${req.params.order_no}.pdf`);
      fs.writeFileSync(pdfPath, pdf);
      await run(db, "UPDATE work_order SET completion_file_path = ? WHERE order_no = ? OR work_order_id = ?", [pdfPath, req.params.order_no, req.params.order_no]);
      res.setHeader("Content-Type", "application/pdf");
      res.send(pdf);
    } catch (error) {
      if (error.code === "PDFKIT_MISSING") return res.status(500).json({ message: "尚未安裝 pdfkit" });
      if (error.code === "SHARP_MISSING") return res.status(500).json({ message: "尚未安裝 sharp" });
      res.status(500).json({ message: "完工施工單匯出失敗", detail: error.message });
    }
  });

  return router;
};
