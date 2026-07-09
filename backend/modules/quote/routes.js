const express = require("express");
const fs = require("fs");
const path = require("path");

function money(value) {
  return `$${Number(value || 0).toLocaleString("zh-TW")}`;
}

function assertQuotePermission(user, quote) {
  if (!user) return false;
  const role = user.role || user.role_code;
  if (["TECHNICIAN", "EMPLOYEE"].includes(role)) return false;
  if (["SUPER_ADMIN", "HQ_ADMIN", "FINANCE_ADMIN"].includes(role)) return true;
  if (["STORE_MANAGER", "門店店長"].includes(role)) return user.store_code === quote.store_code;
  if (["SALES", "門市業務接待"].includes(role)) return String(user.id) === String(quote.created_by);
  return false;
}

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

async function getQuoteBundle(db, quoteId) {
  const quote = await one(db, "SELECT * FROM quote_estimate WHERE quote_id = ?", [quoteId]);
  if (!quote) return null;
  const items = await all(db, `
    SELECT qi.*, spd.name AS standard_name, spd.category AS standard_category
    FROM quote_estimate_item qi
    LEFT JOIN service_price_dict spd ON spd.id = qi.service_price_id
    WHERE qi.quote_id = ?
    ORDER BY qi.id ASC
  `, [quoteId]);
  return { quote, items };
}

function total(quote) {
  return Number(quote.package_total || quote.base_total || quote.original_total || 0)
    + Number(quote.addon_total || 0)
    - Number(quote.discount_amount || 0);
}

function generatePdfBuffer(bundle) {
  const PDFDocument = requirePdfKit();
  const { quote, items } = bundle;

  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 42 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(22).text(quote.store_name || "汽車美容門市", { continued: false });
    doc.moveDown(.3).fontSize(12).text(`報價單編號：${quote.quote_id}`);
    doc.text(`建立時間：${quote.created_at || new Date().toISOString()}`);
    doc.moveDown();

    doc.fontSize(14).text("客戶資訊", { underline: true });
    doc.fontSize(11)
      .text(`車主姓名：${quote.customer_name || ""}`)
      .text(`聯絡電話：${quote.phone || ""}`)
      .text(`車牌號碼：${quote.plate || ""}`)
      .text(`車輛品牌型號：${quote.car_model || ""}`)
      .text(`出廠年份：${quote.car_year || ""}`);
    doc.moveDown();

    doc.fontSize(14).text("套餐與加購清單", { underline: true });
    items.forEach((item) => {
      const name = item.standard_name || item.item_name || item.name || "未命名項目";
      const category = item.standard_category || item.category || "其他系列";
      const qty = Number(item.qty || item.quantity || 1);
      const price = Number(item.unit_price || item.price || 0);
      doc.fontSize(11).text(`${category}｜${name}｜${money(price)} x ${qty}｜小計 ${money(price * qty)}`);
    });
    doc.moveDown();

    doc.fontSize(14).text("金額結算", { underline: true });
    doc.fontSize(12)
      .text(`基礎套餐合計：${money(quote.package_total || quote.base_total || quote.original_total)}`)
      .text(`加購項目合計：${money(quote.addon_total)}`)
      .text(`優惠金額：-${money(quote.discount_amount)}`)
      .text(`最終應付總價：${money(total(quote))}`)
      .text(`已收訂金：${money(quote.deposit_amount)}`);
    doc.moveDown();

    doc.fontSize(10).text("轎車車型以上或車輛過髒等會另外酌收清潔費");
    doc.moveDown(2).fontSize(12).text("門店確認簽名：________________        客戶確認簽名：________________");
    doc.end();
  });
}

module.exports = function quoteRoutes(db, authMiddleware) {
  const router = express.Router();
  const uploadDir = path.join(process.cwd(), "uploads", "quotes");
  fs.mkdirSync(uploadDir, { recursive: true });

  if (authMiddleware) router.use(authMiddleware);

  router.get("/export-pdf/:quote_id", async (req, res) => {
    try {
      const bundle = await getQuoteBundle(db, req.params.quote_id);
      if (!bundle) return res.status(404).json({ message: "單據不存在" });
      if (bundle.quote.status === "已作廢") return res.status(409).json({ message: "已作廢單禁止匯出" });
      if (!assertQuotePermission(req.user || {}, bundle.quote)) return res.status(403).json({ message: "權限不足" });

      if (bundle.quote.pdf_file_path && fs.existsSync(bundle.quote.pdf_file_path)) {
        return res.download(bundle.quote.pdf_file_path, `報價單_${bundle.quote.quote_id}_${bundle.quote.plate || "未填車牌"}.pdf`);
      }

      const buffer = await generatePdfBuffer(bundle);
      const filePath = path.join(uploadDir, `${bundle.quote.quote_id}.pdf`);
      fs.writeFileSync(filePath, buffer);
      await run(db, "UPDATE quote_estimate SET pdf_file_path = ? WHERE quote_id = ?", [filePath, bundle.quote.quote_id]);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(`報價單_${bundle.quote.quote_id}_${bundle.quote.plate || "未填車牌"}.pdf`)}`);
      res.send(buffer);
    } catch (error) {
      if (error.code === "PDFKIT_MISSING") return res.status(500).json({ message: "尚未安裝 pdfkit，請執行 npm install pdfkit" });
      res.status(500).json({ message: "PDF 匯出失敗", detail: error.message });
    }
  });

  router.get("/export-image/:quote_id", async (req, res) => {
    try {
      const sharp = requireSharp();
      const bundle = await getQuoteBundle(db, req.params.quote_id);
      if (!bundle) return res.status(404).json({ message: "單據不存在" });
      if (bundle.quote.status === "已作廢") return res.status(409).json({ message: "已作廢單禁止匯出" });
      if (!assertQuotePermission(req.user || {}, bundle.quote)) return res.status(403).json({ message: "權限不足" });

      if (bundle.quote.img_file_path && fs.existsSync(bundle.quote.img_file_path)) {
        return res.download(bundle.quote.img_file_path, `報價單_${bundle.quote.quote_id}_${bundle.quote.plate || "未填車牌"}.png`);
      }

      const pdfBuffer = await generatePdfBuffer(bundle);
      const pngBuffer = await sharp(pdfBuffer, { density: 300 }).png().toBuffer();
      const filePath = path.join(uploadDir, `${bundle.quote.quote_id}.png`);
      fs.writeFileSync(filePath, pngBuffer);
      await run(db, "UPDATE quote_estimate SET img_file_path = ? WHERE quote_id = ?", [filePath, bundle.quote.quote_id]);
      res.setHeader("Content-Type", "image/png");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(`報價單_${bundle.quote.quote_id}_${bundle.quote.plate || "未填車牌"}.png`)}`);
      res.send(pngBuffer);
    } catch (error) {
      if (error.code === "SHARP_MISSING") return res.status(500).json({ message: "尚未安裝 sharp，請執行 npm install sharp" });
      if (error.code === "PDFKIT_MISSING") return res.status(500).json({ message: "尚未安裝 pdfkit，請執行 npm install pdfkit" });
      res.status(500).json({ message: "圖片匯出失敗", detail: error.message });
    }
  });

  return router;
};
