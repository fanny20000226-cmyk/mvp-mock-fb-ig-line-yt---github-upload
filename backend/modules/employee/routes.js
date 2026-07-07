const express = require("express");
const { requireRole } = require("../auth/rbac");

function employeeRoutes(db) {
  const router = express.Router();
  router.use((req, _res, next) => { req.moduleName = "employee"; next(); });
  router.use(requireRole("employee"));

  router.get("/me", async (req, res) => {
    const employee = await db.get("SELECT id,employee_no,name,department,position,phone FROM employee_account WHERE id=?", [req.user.employeeId]);
    res.json(employee);
  });

  router.post("/clock", async (req, res) => {
    const { clockType, latitude, longitude, deviceId, reason } = req.body;
    const now = new Date().toISOString();
    const status = clockType === "FIELD" ? "FIELD_PENDING" : "NORMAL";
    await db.run(
      "INSERT INTO clock_record(employee_id,clock_type,clock_time,latitude,longitude,device_id,reason,status,audit_status) VALUES(?,?,?,?,?,?,?,?,?)",
      [req.user.employeeId, clockType, now, latitude, longitude, deviceId, reason, status, clockType === "FIELD" ? "PENDING" : "APPROVED"]
    );
    res.json({ ok: true, clockTime: now, status });
  });

  router.get("/clock-records", async (req, res) => {
    res.json(await db.all("SELECT * FROM clock_record WHERE employee_id=? ORDER BY clock_time DESC", [req.user.employeeId]));
  });

  router.post("/punch-correction", async (req, res) => {
    const { targetDate, clockType, requestedTime, reason } = req.body;
    await db.run(
      "INSERT INTO punch_correction_request(employee_id,target_date,clock_type,requested_time,reason) VALUES(?,?,?,?,?)",
      [req.user.employeeId, targetDate, clockType, requestedTime, reason]
    );
    res.json({ ok: true });
  });

  router.post("/leave", async (req, res) => {
    const { leaveType, startTime, endTime, reason } = req.body;
    await db.run("INSERT INTO leave_request(employee_id,leave_type,start_time,end_time,reason) VALUES(?,?,?,?,?)", [req.user.employeeId, leaveType, startTime, endTime, reason]);
    res.json({ ok: true });
  });

  router.post("/overtime", async (req, res) => {
    const { startTime, endTime, reason } = req.body;
    await db.run("INSERT INTO overtime_request(employee_id,start_time,end_time,reason) VALUES(?,?,?,?)", [req.user.employeeId, startTime, endTime, reason]);
    res.json({ ok: true });
  });

  return router;
}

module.exports = employeeRoutes;
