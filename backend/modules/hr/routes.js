const express = require("express");
const { requireRole } = require("../auth/rbac");

function hrRoutes(db) {
  const router = express.Router();
  router.use((req, _res, next) => { req.moduleName = "hr"; next(); });
  router.use(requireRole("hr"));

  router.get("/employees", async (_req, res) => {
    res.json(await db.all("SELECT id,employee_no,username,name,department,position,phone,active FROM employee_account ORDER BY id DESC"));
  });

  router.post("/employees", async (req, res) => {
    const { employeeNo, username, passwordHash, name, department, position, phone } = req.body;
    await db.run(
      "INSERT INTO employee_account(employee_no,username,password_hash,name,department,position,phone) VALUES(?,?,?,?,?,?,?)",
      [employeeNo, username, passwordHash, name, department, position, phone]
    );
    res.json({ ok: true });
  });

  router.get("/attendance-rules", async (_req, res) => {
    res.json(await db.all("SELECT * FROM attendance_rule WHERE active=1 ORDER BY id DESC"));
  });

  router.post("/attendance-rules", async (req, res) => {
    const { departmentId, ruleName, workStart, workEnd, lateGraceMinutes, earlyLeaveGraceMinutes, gpsRequired } = req.body;
    await db.run(
      "INSERT INTO attendance_rule(department_id,rule_name,work_start,work_end,late_grace_minutes,early_leave_grace_minutes,gps_required) VALUES(?,?,?,?,?,?,?)",
      [departmentId, ruleName, workStart, workEnd, lateGraceMinutes || 0, earlyLeaveGraceMinutes || 0, gpsRequired ? 1 : 0]
    );
    res.json({ ok: true });
  });

  router.get("/clock-records", async (req, res) => {
    const { employeeId, from, to } = req.query;
    const rows = await db.all(
      "SELECT * FROM clock_record WHERE (? IS NULL OR employee_id=?) AND (? IS NULL OR clock_time>=?) AND (? IS NULL OR clock_time<=?) ORDER BY clock_time DESC",
      [employeeId || null, employeeId || null, from || null, from || null, to || null, to || null]
    );
    res.json(rows);
  });

  router.post("/month-attendance/generate", async (req, res) => {
    const { yearMonth } = req.body;
    await db.run("INSERT INTO system_operation_log(actor_type,actor_username,action,module,detail_json) VALUES('ADMIN',?,'GENERATE_MONTH_ATTENDANCE','hr',?)", [req.user.username, JSON.stringify({ yearMonth })]);
    res.json({ ok: true, message: "Schedule monthly aggregation job here.", yearMonth });
  });

  return router;
}

module.exports = hrRoutes;
