const express = require("express");
const { requireRole } = require("../auth/rbac");

function operationRoutes(db) {
  const router = express.Router();
  router.use((req, _res, next) => { req.moduleName = "operation"; next(); });
  router.use(requireRole("operation"));

  router.get("/materials", async (_req, res) => {
    res.json(await db.all("SELECT * FROM material_item WHERE active=1 ORDER BY id DESC"));
  });

  router.post("/materials", async (req, res) => {
    const { sku, name, unit, safeStock } = req.body;
    await db.run("INSERT INTO material_item(sku,name,unit,safe_stock) VALUES(?,?,?,?)", [sku, name, unit, safeStock || 0]);
    res.json({ ok: true });
  });

  router.post("/purchase-inbound", async (req, res) => {
    const { inboundNo, supplier, itemId, quantity, unitCost } = req.body;
    await db.run("INSERT INTO purchase_inbound(inbound_no,supplier,item_id,quantity,unit_cost,created_by) VALUES(?,?,?,?,?,?)", [inboundNo, supplier, itemId, quantity, unitCost || 0, req.user.id]);
    res.json({ ok: true });
  });

  router.post("/transfer-out", async (req, res) => {
    const { transferNo, itemId, toStore, quantity } = req.body;
    await db.run("INSERT INTO stock_transfer_out(transfer_no,item_id,to_store,quantity,created_by) VALUES(?,?,?,?,?)", [transferNo, itemId, toStore, quantity, req.user.id]);
    res.json({ ok: true });
  });

  router.post("/stock-count", async (req, res) => {
    const { countNo, store, itemId, bookQty, actualQty, note } = req.body;
    await db.run("INSERT INTO stock_count_sheet(count_no,store,item_id,book_qty,actual_qty,diff_qty,note,created_by) VALUES(?,?,?,?,?,?,?,?)", [countNo, store, itemId, bookQty, actualQty, Number(actualQty) - Number(bookQty), note, req.user.id]);
    res.json({ ok: true });
  });

  return router;
}

module.exports = operationRoutes;
