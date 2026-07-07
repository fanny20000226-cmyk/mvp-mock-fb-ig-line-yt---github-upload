const express = require("express");
const { requireRole } = require("../auth/rbac");

function financeRoutes(db) {
  const router = express.Router();
  router.use((req, _res, next) => { req.moduleName = "finance"; next(); });
  router.use(requireRole("finance"));

  router.get("/ledger", async (_req, res) => {
    res.json(await db.all("SELECT * FROM finance_ledger ORDER BY created_at DESC"));
  });

  router.post("/ledger", async (req, res) => {
    const { type, categoryId, store, amount, paymentMethod, voucherUrl, note } = req.body;
    await db.run(
      "INSERT INTO finance_ledger(type,category_id,store,amount,payment_method,voucher_url,note,source_module,created_by) VALUES(?,?,?,?,?,?,?,?,?)",
      [type, categoryId, store, amount, paymentMethod, voucherUrl, note, "finance", req.user.id]
    );
    res.json({ ok: true });
  });

  router.get("/attendance-summary", async (req, res) => {
    const { yearMonth } = req.query;
    const rows = await db.all(
      "SELECT ma.employee_id, ea.name, ea.department, ma.year_month, ma.work_days, ma.late_count, ma.early_leave_count, ma.overtime_hours, ma.leave_hours FROM month_attendance ma JOIN employee_account ea ON ea.id=ma.employee_id WHERE ma.year_month=?",
      [yearMonth]
    );
    res.json(rows);
  });

  router.post("/payroll/calculate", async (req, res) => {
    const { yearMonth, baseSalaryMap = {} } = req.body;
    const rows = await db.all("SELECT * FROM month_attendance WHERE year_month=?", [yearMonth]);
    for (const row of rows) {
      const base = Number(baseSalaryMap[row.employee_id] || 0);
      const overtimePay = Number(row.overtime_hours || 0) * 200;
      const deduction = Number(row.late_count || 0) * 100 + Number(row.early_leave_count || 0) * 100;
      const net = base + overtimePay - deduction;
      await db.run(
        "INSERT OR REPLACE INTO payroll_record(employee_id,year_month,base_salary,overtime_pay,deduction,net_salary,attendance_snapshot_json,status) VALUES(?,?,?,?,?,?,?,?)",
        [row.employee_id, yearMonth, base, overtimePay, deduction, net, JSON.stringify(row), "DRAFT"]
      );
    }
    res.json({ ok: true });
  });

  return router;
}

module.exports = financeRoutes;
