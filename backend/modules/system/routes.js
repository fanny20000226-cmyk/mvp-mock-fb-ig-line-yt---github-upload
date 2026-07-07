const express = require("express");
const { requireRole, hashPassword } = require("../auth/rbac");

function systemRoutes(db) {
  const router = express.Router();
  router.use((req, _res, next) => { req.moduleName = "system"; next(); });
  router.use(requireRole("system"));

  router.get("/logs", async (_req, res) => {
    res.json(await db.all("SELECT * FROM system_operation_log ORDER BY created_at DESC LIMIT 1000"));
  });

  router.post("/admin/reset-password", async (req, res) => {
    const { username, newPassword } = req.body;
    const passwordHash = await hashPassword(newPassword);
    await db.run("UPDATE admin_user SET password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE username=? AND role IN ('HR_ADMIN','FINANCE_ADMIN')", [passwordHash, username]);
    res.json({ ok: true });
  });

  return router;
}

module.exports = systemRoutes;
